import z from 'zod';
import path from 'path';
import { createPreset } from './create-preset';
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

        ops: z
          .object({
            position: z
              .enum(['pre-install', 'post-install'])
              .optional()
              .default('pre-install'),
          })
          .array()
          .optional()
          .default([]),
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
        copy: z.any().array().optional().default([]),
        /**
         * override auto detect files
         */
        include: z
          .string()
          .array()
          .or(z.string().transform((v) => [v]))
          .optional()
          .default([]),
        exclude: z
          .string()
          .array()
          .or(z.string().transform((v) => [v]))
          .optional()
          .default([]),

        /**
         * files to includes without overriding auto detect files
         */
        extraInclude: z
          .string()
          .array()
          .or(z.string().transform((v) => [v]))
          .default([]),
      })
      .optional()
  ),
  postBuild: zodAutoDefault(
    z
      .object({
        include: z
          .string()
          .array()
          .or(z.string().transform((v) => [v]))
          .optional()
          .default([]),
        copy: z
          .object({
            from: z.string().optional(),
            src: z.string(),
            dst: z.string(),
          })
          .array()
          .optional()
          .default([]),

        ops: z.any().array().optional().default([]),
      })
      .optional()
  ),
});

const detectPackageManager = async (
  dir: string,
  config: Pick<z.output<typeof baseBuildConfig>, 'install'>
): Promise<{
  packageManager: string;
  runScript: (scriptName: string | null, args?: string) => string;
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
      runScript: (script, args = '') => {
        if (script == null) {
          return null;
        }
        return `yarn ${script} ${args}`.trim();
      },
      files: [path.resolve(dir, 'yarn.lock')],
      cmd: flatJoin(cmds, ' '),
    };
  }

  if (await isFileExists(path.resolve(dir, 'package-npm.lock'))) {
    return {
      packageManager: 'npm',
      runScript: (script, args = '') => {
        if (script == null) {
          return null;
        }
        return `npm run ${script} ${args}`.trim();
      },
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
  const { include, exclude, extraInclude } = config.build;
  // TODO: refacto
  const files = await readdir(dir, { withFileTypes: true });
  const res: string[] = [];

  if (include?.length) {
    res.push(...include.filter((i) => !exclude.includes(i)));
  } else {
    // auto detect build files
    for (const file of files) {
      switch (file.name) {
        case 'src':
        case 'tsconfig.json':
        case 'tsconfig.build.json':
        case '.babelrc': {
          if (!exclude.includes(file.name)) {
            res.push(file.name);
          }
          break;
        }
        default:
      }
    }
  }

  if (extraInclude?.length) {
    extraInclude.forEach((f) => {
      if (!res.includes(f)) {
        res.push(f);
      }
    });
  }

  return res;
};

export const nodeBuildPreset = createPreset({
  name: 'node-build',
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
        runScript: install.runScript,
        files: install.files,
        cmd: install.cmd,
      },
      build: {
        ...res.build,
        cmd:
          res.build.cmd ??
          install.runScript(res.build.script) ??
          install.runScript('build'),
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
          postBuild,
        },
        projectDir,
      }) => [
        {
          type: 'WORKDIR',
          value: workdir,
        },
        ...build.copy.map((c) => ({
          type: 'COPY',
          from: c.from,
          src: c.src,
          dst: c.dst,
        })),
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
          type: 'RUN',
          cmd: `${build.cmd}`,
        },
        ...postBuild.include.map((file) => copy(file, projectDir)),
        ...postBuild.copy.map(
          (c): DockerfileOp => ({
            type: 'COPY',
            from: c.from,
            src: c.src,
            dst: c.dst,
          })
        ),
        ...postBuild.ops,
      ],
    },
  },
});
