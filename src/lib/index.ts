import path from 'path';
import { PackageJson, findPackageJson } from './packageJson';
import { appendFile, readdir, stat, writeFile } from 'fs/promises';
import { buildNodeService } from './presets';
import { formatDockerfile } from './dockerfile';
import { isFileExists } from './utils';
import { detectDogenConfig } from './dogenConfig';
import { DogenInputConfig, DogenResolvedConfig } from './types';

const detectBuildFiles = async (dir: string, config: DogenResolvedConfig) => {
  // TODO: refacto
  const files = await readdir(dir, { withFileTypes: true });
  const res: string[] = [];

  const excludes = Array.isArray(config.build?.excludes)
    ? config.build?.excludes
    : config.build?.excludes
    ? [config.build?.excludes]
    : [];

  if (config.build?.includes) {
    if (Array.isArray(config.build.includes)) {
      res.push(...config.build.includes.filter((i) => !excludes.includes(i)));
    } else if (!excludes.includes(config.build.includes)) {
      res.push(config.build.includes);
    }
  } else {
    // auto detect build files
    for (const file of files) {
      switch (file.name) {
        case 'src':
        case 'tsconfig.json':
        case '.babelrc': {
          if (!excludes.includes(file.name)) {
            res.push(file.name);
          }
          break;
        }
        default:
      }
    }
  }

  //#region Extra files
  if (Array.isArray(config.build?.extraIncludes)) {
    config.build.extraIncludes.forEach((f) => {
      if (!res.includes(f)) {
        res.push(f);
      }
    });
  } else if (config.build?.extraIncludes) {
    if (!res.includes(config.build?.extraIncludes)) {
      res.push(config.build?.extraIncludes);
    }
  }
  //#endregion

  return res;
};

const detectPackageManager = async (dir: string) => {
  try {
    await stat(path.resolve(dir, 'yarn.lock'));
    return {
      packageManager: 'yarn',
      runScriptCmd: `yarn`,
      install: {
        files: [path.resolve(dir, 'yarn.lock')],
        cmd: 'yarn install --frozen-lockfile --no-cache',
      },
    };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  try {
    await stat(path.resolve(dir, 'package-npm.lock'));
    return {
      packageManager: 'npm',
      runScriptCmd: `npm run`,
      install: {
        files: [path.resolve(dir, 'package-npm.lock')],
        cmd: 'npm install',
      },
    };
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  throw new Error(`Unable to detect used package manager`);
};

const createDockerfileTargetsFromPackageJson = async ({
  packageJson,
  projectDir,
  config,
}: {
  packageJson: PackageJson;
  projectDir: string;
  config: DogenResolvedConfig;
}) => {
  const { install, packageManager, runScriptCmd } = await detectPackageManager(
    projectDir
  );

  // Build static html that is served using nginx
  if (
    packageJson.dependencies?.['react-scripts'] ||
    packageJson.devDependencies?.['react-scripts']
  ) {
    //
  }

  // Puppeteer require specific base image
  if (
    packageJson.dependencies?.['puppeteer'] ||
    packageJson.devDependencies?.['puppeteer']
  ) {
    //
  }

  const buildFiles = await detectBuildFiles(projectDir, config);

  return buildNodeService({
    packageJson,
    projectDir,
    dockerfilePath: path.resolve(projectDir, 'Dockerfile'),
    config: {
      baseNodeImage: config.nodeImage,
      install,
      build: {
        files: buildFiles,
        cmd:
          config.build?.cmd ?? config.build?.script
            ? `${runScriptCmd} ${config.build.script}`
            : `${runScriptCmd} build`,
      },
      workdir: config.containerWorkdir,
      runCmd:
        config.run?.cmd ?? config.run?.script
          ? `${runScriptCmd} ${config.run.script}`
          : `node ./build/index.js`,
    },
  });
};

export const generateDockerfile = async ({
  dir = process.cwd(),
  conflict,
  mapConfig = (config): DogenResolvedConfig => ({
    ...(config || null),
    nodeImage: config?.nodeImage || 'node:latest',
    containerWorkdir: config?.containerWorkdir || '/app',
  }),
}: {
  dir?: string;
  conflict?: 'overwrite' | 'append';
  mapConfig?: (
    detectedConfig: DogenInputConfig | null
  ) => DogenResolvedConfig | Promise<DogenResolvedConfig>;
}) => {
  const { dir: projectDir, packageJson } = await findPackageJson(
    dir,
    (process.env.HOME as string) ?? '/'
  );

  const { config: inputConfig, warnings } = await detectDogenConfig(projectDir);
  if (warnings.length) {
    console.log(warnings.map((w) => `WARN: ${w}`).join('\n'));
  }

  const config = await mapConfig(inputConfig);

  const { targets } = await createDockerfileTargetsFromPackageJson({
    packageJson,
    projectDir,
    config,
  });
  const dockerfile = formatDockerfile(targets);

  let state: 'created' | 'updated';

  //#region Write/Append
  const dockerfilePath = path.resolve(projectDir, 'Dockerfile');
  const alreadyExists = await isFileExists(dockerfilePath);

  const content = `#dogen\n${dockerfile}\n#enddogen\n`;

  if (!alreadyExists || conflict === 'overwrite') {
    await writeFile(dockerfilePath, content);
    if (alreadyExists) {
      state = 'updated';
    } else {
      state = 'created';
    }
  } else if (conflict === 'append') {
    state = 'updated';
    await appendFile(dockerfilePath, `\n${content}`);
  } else {
    throw new Error(`DOCKERFILE_ALREADY_EXISTS`);
  }
  //#endregion

  return {
    state,
    dockerfilePath,
  };
};
