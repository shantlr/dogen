import z from 'zod';
import { nodeBuildPreset } from './nodeBuild';
import path from 'path';
import { merge, uniq } from 'lodash';
import { DockerfileOp } from '../../dockerfile/types';
import { packageHasDependency } from '../../packageJson';
import { zodAutoDefault } from '../../utils/zod';
import { filterFilesExists } from '../../utils';

const NGINX_DEFAULT_CONF = `server {
  listen       80;
  server_name  localhost;

  location / {
      root   /usr/share/nginx/html;
      index  index.html index.htm;
      try_files $uri /index.html;
  }

  error_page   500 502 503 504  /50x.html;
  location = /50x.html {
      root   /usr/share/nginx/html;
  }
`;

const baseAppConfig = zodAutoDefault(
  z.object({
    build: z
      .object({
        dir: z.string().optional(),
      })
      .nullish(),
    serve: z
      .object({
        targetName: z.string().nullish().default('serve'),
        dir: z.string().nullish(),
        expose: z.coerce.number().nullish().default(80),
        imageName: z.string().nullish().default('nginx:stable-alpine'),
        nginxConfig: z.string().nullish().default(NGINX_DEFAULT_CONF),
        nginxConfigPath: z
          .string()
          .nullish()
          .default('/etc/nginx/conf.d/default.conf'),
      })
      .nullish(),
  })
);

export const baseAppPreset = nodeBuildPreset.extend({
  name: 'app-base',
  mapConfigAfter: ({ inputConfig, config }) =>
    merge(config, baseAppConfig.parse(inputConfig)),
  targets: {
    serve: {
      as: ({ config: { serve } }) => serve.targetName,
      from: ({ config: { serve } }) => serve.imageName,
      ops: ({ config: { container, build, serve } }): DockerfileOp[] => [
        {
          type: 'COPY',
          from: '@/build',
          src: path.resolve(container.workdir, build.dir ?? 'dist'),
          dst: serve.dir,
        },
        {
          type: 'WRITE_FILE',
          content: serve.nginxConfig,
          dst: serve.nginxConfigPath,
        },
        {
          type: 'EXPOSE',
          port: Number(serve.expose),
        },
      ],
    },
  },
});

export const craPreset = baseAppPreset.extend({
  name: 'cra',
  shouldUsePreset: ({ packageJson }) =>
    packageHasDependency(packageJson, 'react-scripts'),
  mapConfigAfter: async ({ config, projectDir }) => {
    if (!config.build.dir) {
      config.build.dir = 'build';
    }
    config.build.files = uniq([
      ...config.build.files,
      ...(await filterFilesExists(['public'], projectDir)),
    ]);
    return config;
  },
});

export const vitePreset = baseAppPreset.extend({
  name: 'vite',
  shouldUsePreset: ({ packageJson }) =>
    packageHasDependency(packageJson, 'vite'),
  mapConfigAfter: async ({ preset, ...input }) => {
    const res = await preset.mapConfig(input);
    res.build.files = uniq([
      ...res.build.files,
      ...(await filterFilesExists(
        ['public', 'vite.config.ts', 'vite.config.js', 'tsconfig.node.json'],
        input.projectDir
      )),
    ]);
    return res;
  },
});

export const nextPreset = vitePreset.extend({
  name: 'next',
  shouldUsePreset: ({ packageJson }) =>
    packageHasDependency(packageJson, 'next'),
});
