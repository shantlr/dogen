import path from 'path';
import { PackageJson, findPackageJson } from './packageJson';
import { appendFile, writeFile } from 'fs/promises';
import { buildNodeService } from './presets';
import { formatDockerfile } from './dockerfile';
import { StringOrDeepStringArray, fcmd, flatJoin, isFileExists } from './utils';
import { detectDogenConfig } from './dogenConfig';
import { DogenConfig, DogenResolvedConfig } from './types';
import { DockerfileRunMount } from './dockerfile/types';
import { buildAppService } from './presets/app';
import { detectBuildFiles } from './detectBuildFiles';

export const detectPackageManager = async (
  dir: string,
  config: Pick<DogenResolvedConfig, 'install'>
): Promise<{
  packageManager: string;
  runScriptCmd: string;
  install: {
    name: string;
    files: string[];
    mounts: DockerfileRunMount[];
    cmd: string;
  };
}> => {
  const mounts: DockerfileRunMount[] = [];

  if (config.install?.npmrc) {
    mounts.push({
      id:
        typeof config.install.npmrc === 'string'
          ? config.install.npmrc
          : 'npmrc',
      dst: '.npmrc',
      type: 'secret',
      readOnly: true,
    });
  }

  if (await isFileExists(path.resolve(dir, 'yarn.lock'))) {
    const installOpts = ['--pure-lockfile', '--non-interactive'];
    const cmds: StringOrDeepStringArray = [['yarn install', installOpts]];
    if (config.install?.keepCache !== true) {
      installOpts.push(`--cache-folder ./.ycache`);
      cmds.push(`&& rm -rf ./.ycache`);
    }

    return {
      packageManager: 'yarn',
      runScriptCmd: `yarn`,
      install: {
        name: config.install?.name || 'install-deps',
        mounts,
        files: [path.resolve(dir, 'yarn.lock')],
        cmd: flatJoin(cmds, ' '),
      },
    };
  }

  if (await isFileExists(path.resolve(dir, 'package-npm.lock'))) {
    return {
      packageManager: 'npm',
      runScriptCmd: `npm run`,
      install: {
        name: config.install?.name || 'install-deps',
        mounts,
        files: [path.resolve(dir, 'package-npm.lock')],
        cmd: 'npm install',
      },
    };
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
    projectDir,
    config
  );

  const buildFiles = await detectBuildFiles({
    packageJson,
    dir: projectDir,
    config,
  });

  // Build static html that is served using nginx
  if (
    packageJson.dependencies?.['react-scripts'] ||
    packageJson.devDependencies?.['react-scripts'] ||
    packageJson.dependencies?.['vite'] ||
    packageJson.devDependencies?.['vite']
  ) {
    return buildAppService({
      packageJson,
      projectDir,
      config: {
        baseNodeImage: config.nodeImage,
        workdir: config?.container?.workdir,
        extractDeps: {
          name: 'extract-deps',
        },
        install,
        postBuild: {
          files:
            typeof config.postBuild?.includes === 'string'
              ? [config.postBuild?.includes]
              : config.postBuild?.includes || [],
        },
        build: {
          name: config?.build?.name || 'build',
          dir: config?.build?.dir || 'build',
          files: buildFiles,
          cmd:
            config.build?.cmd ||
            fcmd`${runScriptCmd} ${config.build?.script}` ||
            (packageJson.scripts?.['build:prod'] &&
              `${runScriptCmd} ${'build:prod'}`) ||
            `${runScriptCmd} build`,
        },
        serve: {
          imageName: config?.serve?.imageName || 'nginx:stable-alpine',
          customConfig: config?.serve?.customConfig,
          configPath:
            config?.serve?.configPath || `/etc/nginx/conf.d/default.conf`,
          name: config?.serve?.name || 'serve',
          dir: config?.serve?.dir,
          expose: config?.serve?.expose || 80,
        },
      },
    });
  }

  // Puppeteer require specific base image
  if (
    packageJson.dependencies?.['puppeteer'] ||
    packageJson.devDependencies?.['puppeteer']
  ) {
    //
  }

  return buildNodeService({
    packageJson,
    projectDir,
    config: {
      baseNodeImage: config.nodeImage,
      deps: {
        name: 'extract-deps',
      },
      install,
      build: {
        name: config.build?.name || 'build',
        files: buildFiles,
        cmd:
          config.build?.cmd ||
          fcmd`${runScriptCmd} ${config.build?.script}` ||
          (packageJson.scripts?.['build:prod'] &&
            `${runScriptCmd} ${'build:prod'}`) ||
          `${runScriptCmd} build`,
      },
      postBuild: {
        files:
          typeof config.postBuild?.includes === 'string'
            ? [config.postBuild?.includes]
            : config.postBuild?.includes || [],
      },
      workdir: config.container.workdir,
      run: {
        name: 'service',
        cmd:
          config.run?.cmd ||
          fcmd`${runScriptCmd} ${config.run?.script}` ||
          fcmd`node ${packageJson.main}` ||
          'node ./build/index.js',
      },
    },
  });
};

export const generateDockerfile = async ({
  dir = process.cwd(),
  conflict,
  config: customConfig,
  mapConfig = (config): DogenResolvedConfig => ({
    ...(config || null),
    nodeImage: config?.nodeImage || 'node:latest',
    container: {
      ...(config?.container || null),
      workdir: config?.container?.workdir || '/app',
    },
  }),
}: {
  dir?: string;
  conflict?: 'overwrite' | 'append';
  /**
   * If not provided, will try to autodetect it
   */
  config?: DogenConfig;
  mapConfig?: (
    detectedConfig: DogenConfig | null
  ) => DogenResolvedConfig | Promise<DogenResolvedConfig>;
}) => {
  const { dir: projectDir, packageJson } = await findPackageJson(
    dir,
    (process.env.HOME as string) ?? '/'
  );

  let inputConfig = customConfig;
  //#region Autodetect config if not provided
  if (!inputConfig) {
    const { config, warnings } = await detectDogenConfig(projectDir);
    inputConfig = config;
    if (warnings.length) {
      console.log(warnings.map((w) => `WARN: ${w}`).join('\n'));
    }
  }
  //#endregion

  const config = await mapConfig(inputConfig);

  const { targets } = await createDockerfileTargetsFromPackageJson({
    packageJson,
    projectDir,
    config,
  });
  const dockerfile = formatDockerfile(targets);

  let operation: 'created' | 'updated';

  //#region Write/Append Dockerfile
  const dockerfilePath = path.resolve(projectDir, 'Dockerfile');
  const alreadyExists = await isFileExists(dockerfilePath);

  const content = `#dogen\n${dockerfile}\n#enddogen\n`;

  if (!alreadyExists || conflict === 'overwrite') {
    await writeFile(dockerfilePath, content);
    if (alreadyExists) {
      operation = 'updated';
    } else {
      operation = 'created';
    }
  } else if (conflict === 'append') {
    operation = 'updated';
    await appendFile(dockerfilePath, `\n${content}`);
  } else {
    throw new Error(`DOCKERFILE_ALREADY_EXISTS`);
  }
  //#endregion

  return {
    operation,
    dockerfilePath,
  };
};
