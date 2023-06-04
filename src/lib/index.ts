import path from 'path';
import { PackageJson } from './packageJson';
import { readdir, stat } from 'fs/promises';
import { buildNodeService } from '..';

export const detectBuildFiles = async (dir: string) => {
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

export const detectPackageManager = async (dir: string) => {
  try {
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

export const createTargetsFromPackageJson = async ({
  packageJson,
  packageJsonPath,
}: {
  packageJson: PackageJson;
  packageJsonPath: string;
}) => {
  if (
    packageJson.dependencies?.['react-scripts'] ||
    packageJson.devDependencies?.['react-scripts']
  ) {
    //
  }

  if (
    packageJson.dependencies?.['puppeteer'] ||
    packageJson.devDependencies?.['puppeteer']
  ) {
    //
  }

  const projectDir = path.parse(packageJsonPath).dir;

  const buildFiles = await detectBuildFiles(projectDir);
  const { install, packageManager, runScriptCmd } = await detectPackageManager(
    projectDir
  );

  await buildNodeService({
    packageJson,
    packageJsonPath,
    dockerfilePath: path.resolve(path.parse(packageJsonPath).dir, 'Dockerfile'),
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
  //
};
