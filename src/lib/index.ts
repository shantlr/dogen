import path from 'path';
import { PackageJson, findPackageJson } from './packageJson';
import { readdir, stat, writeFile } from 'fs/promises';
import { buildNodeService } from '..';
import { formatDockerfile } from './dockerfile';

const detectBuildFiles = async (dir: string) => {
  const files = await readdir(dir, { withFileTypes: true });
  const res: string[] = [];

  for (const file of files) {
    switch (file.name) {
      case 'src':
      case 'tsconfig.json':
      case '.babelrc': {
        res.push(path.resolve(dir, file.name));
        break;
      }
      default:
    }
  }
  return res;
};

const detectPackageManager = async (dir: string) => {
  try {
    console.log(dir, 'yarn.lock');
    await stat(path.resolve(dir, 'yarn.lock'));
    return {
      packageManager: 'yarn',
      runScriptCmd: `yarn`,
      install: {
        files: [path.resolve(dir, 'yarn.lock')],
        cmd: 'yarn install',
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
}: {
  packageJson: PackageJson;
  projectDir: string;
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

  const buildFiles = await detectBuildFiles(projectDir);

  return buildNodeService({
    packageJson,
    projectDir,
    dockerfilePath: path.resolve(projectDir, 'Dockerfile'),
    config: {
      baseNodeImage: 'node:latest',
      install,
      build: {
        files: buildFiles,
        cmd: `${runScriptCmd} build`,
      },
      workdir: '/app',
      runCmd: `node ./build/index.js`,
    },
  });
};

export const generateDockerfile = async ({
  dir = process.cwd(),
}: {
  dir?: string;
}) => {
  const { dir: projectDir, packageJson } = await findPackageJson(
    dir,
    (process.env.HOME as string) ?? '/'
  );

  const { targets } = await createDockerfileTargetsFromPackageJson({
    packageJson,
    projectDir,
  });
  const dockerfile = formatDockerfile(targets);
  await writeFile(path.resolve(projectDir, 'Dockerfile'), dockerfile);
};
