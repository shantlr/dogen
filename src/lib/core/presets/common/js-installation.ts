import { readFile } from 'fs/promises';
import path from 'path';

import { Debugger } from 'debug';
import { execa } from 'execa';

import { copies } from '../../../dockerfile';
import { PackageManagerName, DogenConfig } from '../../../dogen-config';
import { findPackageJson, PackageJson } from '../../../package-json';
import { filterFsExists, isFileExists } from '../../../utils';
import { createPreset } from '../utils/create-preset';
import { createTarget } from '../utils/create-target';

type PackageManager = {
  name: PackageManagerName;
  version?: string;
  installModules: (opt?: { noCache?: boolean }) => string[];
  runScript: (script: string | string[]) => string | string[];
  installFiles: string[];
};
const getPackageManager = ({
  name,
  version,
}: {
  name: PackageManagerName;
  version?: string;
}): PackageManager => {
  switch (name) {
    case 'npm':
      return {
        name: 'npm',
        version,
        installModules: () => {
          return ['npm', 'install'];
        },
        runScript: (args) => {
          if (typeof args === 'string') {
            return `npm run ${args}`;
          }
          return ['npm', 'run', ...args];
        },
        installFiles: ['package-lock.json'],
      };
    case 'yarn@1':
      return {
        name: 'yarn@1',
        version,
        installModules: () => {
          return [
            '/bin/sh',
            '-c',
            'yarn',
            'install',
            '--pure-lockfile',
            '--non-interactive',
            '--cache-folder',
            './.ycache',
            '&&',
            'rm',
            '-rf',
            './.ycache',
          ];
        },
        runScript: (arg) => {
          if (typeof arg === 'string') {
            return `yarn run ${arg}`;
          }
          return ['yarn', 'run', ...arg];
        },
        installFiles: ['yarn.lock'],
      };
    case 'yarn@4': {
      return {
        name: 'yarn@4',
        version,
        installModules: () => {
          return ['yarn', 'install', '--refresh-lockfile'];
        },
        runScript: (arg) => {
          if (typeof arg === 'string') {
            return `yarn run ${arg}`;
          }
          return ['yarn', 'run', ...arg];
        },
        installFiles: ['yarn.lock', '.yarnrc.yml'],
      };
    }
    default:
  }

  throw new Error(`Unknown package manager: ${name}`);
};
async function detectPackageManager({
  dir,
  packageJson,
}: {
  dir: string;
  packageJson: PackageJson;
}): Promise<{
  name: PackageManagerName;
  version?: string;
}> {
  if (packageJson.packageManager) {
    if (packageJson.packageManager.startsWith('yarn@4.')) {
      return {
        name: 'yarn@4',
        version: packageJson.packageManager.split('@')[1],
      };
    }
    if (packageJson.packageManager.startsWith('yarn@')) {
      return {
        name: 'yarn@1',
        version: packageJson.packageManager.split('@')[1],
      };
    }
  }

  if (await isFileExists(path.resolve(dir, '.yarnrc.yml'))) {
    return { name: 'yarn@4' };
  }
  if (await isFileExists(path.resolve(dir, 'yarn.lock'))) {
    return { name: 'yarn@1' };
  }

  if (await isFileExists(path.resolve(dir, 'package-npm.lock'))) {
    return { name: 'npm' };
  }

  throw new Error(`Unable to detect used package manager at '${dir}'`);
}

const detectNodeVersion = async (project: {
  dir: string;
  packageJson: PackageJson;
}) => {
  if (typeof process.env.NODE_ENV === 'string') {
    const match = process.env.NODE_ENV.match(/(?<version>\d+\.\d+\.\d+)/);
    return match?.groups?.version;
  }

  if ('volta' in project.packageJson) {
    const volta = project.packageJson.volta as {
      node?: string;
    };
    if (volta?.node) {
      return volta.node;
    }
  }

  if (project.packageJson.engines?.node) {
    const match = project.packageJson.engines.node.match(
      /(?<version>\d+\.\d+\.\d+)/,
    );
    if (match?.groups?.version) {
      return match.groups.version;
    }
  }
  if (await isFileExists('.nvmrc')) {
    const nvmrc = await readFile('.nvmrc', 'utf-8');
    const match = nvmrc.match(/(?<version>\d+\.\d+\.\d+)/);
    if (match?.groups?.version) {
      return match.groups.version;
    }
  }
  if (await isFileExists('.node-version')) {
    const nodeVersion = await readFile('.node-version', 'utf-8');
    const match = nodeVersion.match(/(?<version>\d+\.\d+\.\d+)/);
    if (match?.groups?.version) {
      return match.groups.version;
    }
  }

  try {
    const { stdout } = await execa({
      cwd: project.dir,
    })`node --version`;
    const match = stdout.match(/v(?<version>\d+\.\d+\.\d+)/);
    if (match?.groups?.version) {
      return match.groups.version;
    }
  } catch {
    //
  }

  return 'latest';
};

export const jsInstallationPreset = createPreset({
  name: 'dogen/js/installation',
  run: async ({
    project,
    dogenConfig,
    dockerContextRoot,
    logger,
  }: {
    project: NonNullable<Awaited<ReturnType<typeof findPackageJson>>>;
    dogenConfig: DogenConfig;
    dockerContextRoot: string;
    logger?: Debugger;
  }) => {
    const log = logger?.extend('js-installation');

    //#region Detect package manager
    let packageManagerToUse = dogenConfig.package_manager
      ? {
          name: dogenConfig.package_manager,
        }
      : undefined;

    if (!packageManagerToUse) {
      packageManagerToUse = await detectPackageManager(project);
    }

    if (!packageManagerToUse) {
      throw new Error(
        `Unable to detect used package manager at '${project.dir}'`,
      );
    }
    const packageManager = getPackageManager(packageManagerToUse);
    //#endregion

    log?.(
      `detected package manager: ${packageManager.name}(${packageManager.version ?? '<no-specific-version>'})`,
    );

    //#region Detect node version
    let nodeImage: string | undefined =
      dogenConfig.node?.from ??
      (dogenConfig.node?.version
        ? `node:${dogenConfig.node.version}-alpine`
        : undefined);
    if (!dogenConfig.node?.from && !dogenConfig.node?.version) {
      const detectedNodeVersion = await detectNodeVersion(project);
      nodeImage = `node:${detectedNodeVersion}-alpine`;
      log?.(`detected node version: ${detectedNodeVersion}`);
    }
    //#endregion
    if (!nodeImage) {
      throw new Error('Unable to detect node image');
    }

    const targetJq = dogenConfig.extract_deps?.jq_image_name
      ? createTarget({
          from: dogenConfig.extract_deps.jq_image_name,
          as: 'jq',
        })
      : createTarget({
          from: 'alpine:3.12',
          as: 'jq',
          ops: [{ type: 'RUN', cmd: 'apk add --update --no-cache jq' }],
        });

    const targetNode = createTarget({
      from: nodeImage,
      as: 'base_node',
      ops: [
        ...(packageManager.name === 'yarn@4' &&
        packageManager.version &&
        dogenConfig.node?.setupPackageManagerVersion
          ? [
              {
                type: 'ENV' as const,
                values: {
                  YARN_VERSION: packageManager.version,
                },
              },
              {
                type: 'RUN' as const,
                cmd: `corepack enable && yarn set version ${packageManager.version}`,
              },
            ]
          : []),
      ],
    });

    //#region Extract dependencies
    const targetExtractPkgDeps = createTarget({
      comments: [
        'Extract minimal fields for dependencies installation',
        'This step avoid reinstalling node_modules due to field that is unrelated',
      ],
      from: targetJq,
      as: dogenConfig!.extract_deps!.target_name!,
      ops: [
        {
          type: 'COPY',
          src: path.relative(dockerContextRoot, project.packageJsonPath),
          dst: `/tmp/package.json`,
        },
        {
          type: 'RUN',
          cmd: `jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json`,
        },
      ],
    });
    //#endregion

    //#region Install node_modules
    const targetInstall = createTarget({
      comments: ['Install node_modules'],
      from: dogenConfig.install?.from || targetNode,
      as: dogenConfig!.install!.target_name!,
      ops: [
        {
          type: 'WORKDIR',
          value: dogenConfig!.container!.workdir!,
        },
        {
          type: 'COPY',
          from: targetExtractPkgDeps,
          src: `/tmp/deps.json`,
          dst: `package.json`,
        },
        ...copies(
          [...(await filterFsExists(packageManager.installFiles, project.dir))],
          {
            dockerContextRoot,
            srcRoot: project.dir,
          },
        ),
        {
          type: 'RUN',
          cmd: dogenConfig?.install?.cmd ?? packageManager.installModules(),
          // mounts: install.mounts?.map((m) => ({
          //   ...m,
          //   dst: path.resolve(workdir, m.dst),
          // })),
        },
      ],
    });
    //#endregion

    return {
      handled: true,
      data: {
        packageManager,
        targets: {
          jq: targetJq,
          node: targetNode,
          extractDeps: targetExtractPkgDeps,
          install: targetInstall,
        },
      },
    };
  },
});
