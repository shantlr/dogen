import z from 'zod';
import path from 'path';
import { createPreset } from './createPreset';
import { readdir } from 'fs/promises';
import { zodAutoDefault } from '../../utils/zod';
import { DockerfileOp, DockerfileRunMount } from '../../dockerfile/types';
import { StringOrDeepStringArray, flatJoin, isFileExists } from '../../utils';
import { copy } from '../../dockerfile';

export const depsFiles: {
  [depName: string]: string[];
} = {
  typescript: ['tsconfig.json'],
  prettier: ['.prettierrc'],
  eslint: [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc.json',
  ],
};

const baseBuildConfig = z.object({
  nodeImage: z.string().default('node:latest'),
  container: zodAutoDefault(
    z
      .object({
        workdir: z.string().nullish().default('/service'),
      })
      .optional()
  ),
  extractPkgDeps: zodAutoDefault(
    z
      .object({
        targetName: z.string().default('extract-pkg-deps'),
        cmd: z
          .string()
          .default(
            `jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json`
          ),
      })
      .optional()
  ),
  install: zodAutoDefault(
    z
      .object({
        targetName: z.string().default('install-modules'),
        keepCache: z.boolean().default(false),
        npmrc: z.union([z.string(), z.boolean()]).nullish(),
        cmd: z.string().nullish(),

        packageManager: z.enum(['npm', 'yarn', 'pnpm']).nullish(),
      })
      .optional()
  ).transform((v) => {
    const res = {
      ...v,
      mounts: [] as DockerfileRunMount[],
    };
    if (res.npmrc === true) {
      res.mounts.push({
        id: 'npmrc',
        dst: '.npmrc',
        type: 'secret',
        readOnly: true,
      });
    }
    return res;
  }),
  build: zodAutoDefault(
    z
      .object({
        targetName: z.string().default('build'),
        script: z.string().optional(),
        cmd: z.string().optional(),
        /**
         * override auto detect files
         */
        includes: z
          .string()
          .array()
          .or(z.string().transform((v) => [v]))
          .optional()
          .default([]),
        excludes: z
          .string()
          .array()
          .or(z.string().transform((v) => [v]))
          .optional()
          .default([]),

        /**
         * files to includes without overriding auto detect files
         */
        extraIncludes: z
          .string()
          .array()
          .or(z.string().transform((v) => [v]))
          .default([]),
      })
      .optional()
  ),
  postBuild: z
    .object({
      includes: z.string(),
    })
    .optional(),
});

const detectPackageManager = async (
  dir: string,
  config: Pick<z.output<typeof baseBuildConfig>, 'install'>
): Promise<{
  packageManager: string;
  runScriptCmd: string;
  files: string[];
  cmd: string;
}> => {
  if (await isFileExists(path.resolve(dir, 'yarn.lock'))) {
    const installOpts = ['--pure-lockfile', '--non-interactive'];
    const cmds: StringOrDeepStringArray = ['yarn install', installOpts];
    if (config.install?.keepCache !== true) {
      installOpts.push(`--cache-folder ./.ycache`);
      cmds.push(`&& rm -rf ./.ycache`);
    }

    return {
      packageManager: 'yarn',
      runScriptCmd: `yarn`,
      files: [path.resolve(dir, 'yarn.lock')],
      cmd: flatJoin(cmds, ' '),
    };
  }

  if (await isFileExists(path.resolve(dir, 'package-npm.lock'))) {
    return {
      packageManager: 'npm',
      runScriptCmd: `npm run`,
      files: [path.resolve(dir, 'package-npm.lock')],
      cmd: 'npm install',
    };
  }

  throw new Error(`Unable to detect used package manager`);
};

const detectBuildFiles = async (
  dir: string,
  config: z.output<typeof baseBuildConfig>
) => {
  const { includes, excludes, extraIncludes } = config.build;
  // TODO: refacto
  const files = await readdir(dir, { withFileTypes: true });
  const res: string[] = [];

  if (includes?.length) {
    res.push(...includes.filter((i) => !excludes.includes(i)));
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

  if (extraIncludes?.length) {
    config.build.extraIncludes.forEach((f) => {
      if (!res.includes(f)) {
        res.push(f);
      }
    });
  }

  return res;
};

export const buildNodeBasePreset = createPreset({
  name: 'dogen-node-build-base',
  shouldUsePreset: () => true,

  includes: ['dogen-jq'],

  mapConfig: async ({ config, projectDir }) => {
    const res = await baseBuildConfig.parseAsync(config);
    const [install, buildFiles] = await Promise.all([
      detectPackageManager(projectDir, res),
      detectBuildFiles(projectDir, res),
    ]);

    return {
      ...res,
      install: {
        ...res.install,
        packageManager: install.packageManager,
        runScriptCmd: install.runScriptCmd,
        files: install.files,
        cmd: install.cmd,
      },
      build: {
        ...res.build,
        cmd: res.build.cmd ?? `${install.runScriptCmd} build`,
        files: buildFiles,
      },
    };
  },

  targets: {
    node: {
      from: ({ config: { nodeImage } }) => nodeImage,
      as: 'node-base',
    },
    extractPkgDeps: {
      comment: [
        'Extract minimal fields for dependencies installation',
        'This step avoid reinstalling node_modules due to field that is unrelated',
      ],
      from: '@dogen-jq/jq',
      as: ({ config: { extractPkgDeps } }) => extractPkgDeps.targetName,
      ops: ({ config: { extractPkgDeps } }) => [
        {
          type: 'COPY',
          src: 'package.json',
          dst: `/tmp/package.json`,
        },
        {
          type: 'RUN',
          cmd: extractPkgDeps.cmd,
        },
      ],
    },
    install: {
      from: '@/node',
      comment: ['Install node_modules'],
      as: ({ config: { install } }) => install.targetName,
      ops: ({
        projectDir,
        config: {
          container: { workdir },
          install,
        },
      }) => [
        {
          type: 'WORKDIR',
          value: workdir,
        },
        {
          type: 'COPY',
          from: '@/extractPkgDeps',
          src: `/tmp/deps.json`,
          dst: `package.json`,
        },
        ...install.files.map((f): DockerfileOp => copy(f, projectDir)),
        {
          type: 'RUN',
          cmd: install.cmd,
          mounts: install.mounts?.map((m) => ({
            ...m,
            dst: path.resolve(workdir, m.dst),
          })),
        },
      ],
    },
    build: {
      from: '@/node',
      comment: ['Build'],
      as: ({ config: { build } }) => build.targetName,
      ops: ({
        config: {
          container: { workdir },
          build,
        },
        projectDir,
      }) => [
        {
          type: 'WORKDIR',
          value: workdir,
        },
        {
          type: 'COPY',
          from: '@/install',
          src: `${workdir}/node_modules`,
          dst: 'node_modules',
        },
        {
          type: 'COPY',
          src: 'package.json',
        },
        ...build.files.map((f): DockerfileOp => copy(f, projectDir)),
        {
          type: 'CMD',
          cmd: `${build.cmd}`,
        },
      ],
    },
    // run: {
    //   from: '@this/node',
    //   ops: ({
    //     config: {
    //       run: { cmd, expose },
    //     },
    //   }) => [
    //     {
    //       type: 'CMD',
    //       cmd: `${cmd}`,
    //     },
    //     typeof expose === 'number' && {
    //       type: 'EXPOSE',
    //       port: expose,
    //     },
    //   ],
    // },
  },
});
