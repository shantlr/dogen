import path from 'path';

import { PresetInput } from '../types';
import { createPreset } from '../utils/create-preset';
import { createTarget } from '../utils/create-target';

import { extendInput, jsBuildPreset } from './js-build';

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
}`;

export const serveStaticJsBuildPreset = createPreset({
  name: 'dogen/js/serve-static-js-build',
  run: async (input: PresetInput<typeof jsBuildPreset>) => {
    const res = await jsBuildPreset.run(
      extendInput(input, {
        config: {
          default: {
            build: {
              output_dir: 'dist',
            },
            serve: {
              from_image: 'nginx:stable-alpine',
              config: NGINX_DEFAULT_CONF,
              config_dst: '/etc/nginx/conf.d/default.conf',
              expose: 80,
            },
          },
        },
      }),
    );

    if (!res.handled) {
      return res;
    }

    const { targets, dogenConfig } = res.data;

    return {
      handled: true,
      data: {
        ...res.data,
        targets: {
          ...targets,
          serve: createTarget({
            from: dogenConfig.serve!.from_image!,
            as: dogenConfig.serve!.target_name!,
            comments: ['Serve built static files using a reverse proxy'],
            ops: [
              {
                type: 'COPY',
                from: targets.build,
                src: path.resolve(
                  dogenConfig.container!.workdir!,
                  dogenConfig.build!.output_dir!,
                ),
                dst: '/usr/share/nginx/html',
              },
              {
                type: 'WRITE_FILE',
                content: dogenConfig.serve!.config!,
                dst: dogenConfig.serve!.config_dst!,
              },
              {
                type: 'EXPOSE',
                port: dogenConfig.serve!.expose!,
              },
            ],
          }),
        },
      },
    };
  },
});
