import path from 'path';
import { copy } from '../dockerfile';
import { JQ_PRESETS } from '../dockerfile/presets';
import {
  DockerfileOp,
  DockerfileRunMount,
  DockerfileTarget,
} from '../dockerfile/types';
import { PackageJson } from '../packageJson';
import { formatTargetName } from './utils';

export const buildAppService = ({
  packageJson,
  projectDir,
  config,
}: {
  packageJson: PackageJson;
  projectDir: string;
  config: {
    workdir: string;
    targetPrefix?: string;
    baseNodeImage: string;

    extractDeps: {
      name: string;
    };

    install: {
      name?: string;
      mounts?: DockerfileRunMount[];
      files: (string | [string, string])[];
      /**
       * command to run to install dependencies
       * @example yarn install
       */
      cmd: string | string[];
    };
    build: {
      name?: string;
      dir: string;
      /**
       * file to copy required for building service
       */
      files: (string | [string, string])[];
      /**
       * @example yarn build
       */
      cmd: string | string[];
    };
    postBuild: {
      files: string[];
    };
    serve: {
      imageName?: string;
      name?: string;
      customConfig?: string;
      configPath?: string;
      dir: string;
      expose?: number;
    };
  };
}) => {
  const asPrefix = config.targetPrefix || '';
  const pkgName = formatTargetName(packageJson.name);
  const workdir = config.workdir;

  const nodeBaseTarget: DockerfileTarget = {
    from: config.baseNodeImage,
    as: `${asPrefix}node-base`,
    comment: `Base image that will be used for installing / running service`,
    ops: [],
  };

  const extractPackageJsonDepsTarget: DockerfileTarget = {
    from: JQ_PRESETS,
    as: config.extractDeps?.name || `${asPrefix}${pkgName}_extract-deps`,
    comment: `Strip package.json and only keep fields used for installing node_modules`,
    ops: [
      {
        type: 'COPY',
        src: 'package.json',
        dst: `/tmp/package.json`,
      },
      {
        type: 'RUN',
        cmd: `jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json`,
      },
    ],
  };

  const installTarget: DockerfileTarget = {
    from: nodeBaseTarget,
    as: config.install?.name || `${asPrefix}${pkgName}_install-deps`,
    comment: `Install ${packageJson.name} node_modules`,
    ops: [
      {
        type: 'WORKDIR',
        value: workdir,
      },
      {
        type: 'COPY',
        from: extractPackageJsonDepsTarget.as,
        src: `/tmp/deps.json`,
        dst: `package.json`,
      },
      ...config.install.files.map((f): DockerfileOp => copy(f, projectDir)),
      {
        type: 'RUN',
        cmd: config.install.cmd,
        mounts: config.install.mounts?.map((m) => ({
          ...m,
          dst: path.resolve(config.workdir, m.dst),
        })),
      },
    ],
  };

  const buildTarget: DockerfileTarget = {
    from: nodeBaseTarget,
    as: config.build?.name || `${asPrefix}${pkgName}_build`,
    comment: `Build ${packageJson.name}`,
    ops: [
      {
        type: 'WORKDIR',
        value: workdir,
      },
      {
        type: 'COPY',
        from: installTarget.as,
        src: `${workdir}/node_modules`,
        dst: 'node_modules',
      },
      {
        type: 'COPY',
        src: 'package.json',
      },
      ...config.build.files.map((f): DockerfileOp => copy(f, projectDir)),
      {
        type: 'CMD',
        cmd: config.build.cmd,
      },
    ],
  };

  const serveTarget: DockerfileTarget = {
    from: config.serve?.imageName,
    as: config.serve?.name || `${asPrefix}${pkgName}`,
    comment: `Serve ${pkgName}`,
    ops: [
      {
        type: 'COPY',
        src: path.resolve(workdir, config.build.dir),
        dst: config.serve.dir,
        from: buildTarget,
      },
      {
        type: 'WRITE_FILE',
        content:
          config.serve?.customConfig ||
          `server {
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
`,
        dst: config.serve?.configPath || `/etc/nginx/conf.d/default.conf`,
      },
      //       {
      //         type: 'RUN',
      //         cmd: `echo "${config.serve?.customConfig ||}" > ${config.serve?.configPath || '/etc/nginx/conf.d/default.conf'}`, [
      //           'echo',
      //           config.serve?.customConfig ||
      //             `server {
      //     listen       80;
      //     server_name  localhost;

      //     location / {
      //         root   /usr/share/nginx/html;
      //         index  index.html index.htm;
      //         try_files $uri /index.html;
      //     }

      //     error_page   500 502 503 504  /50x.html;
      //     location = /50x.html {
      //         root   /usr/share/nginx/html;
      //     }
      // `,
      //           '>',
      //           config.serve.configPath,
      //         ],
      //       },
      {
        type: 'EXPOSE',
        port: config.serve?.expose || 80,
      },
    ],
  };

  if (config.postBuild.files.length) {
    buildTarget.ops.push(
      ...config.postBuild.files.map((f) => copy(f, projectDir))
    );
  }
  return {
    targets: [
      JQ_PRESETS,
      extractPackageJsonDepsTarget,
      nodeBaseTarget,
      installTarget,
      buildTarget,
      serveTarget,
    ],
  };
};
