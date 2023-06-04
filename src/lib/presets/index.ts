import path from 'path';
import { JQ_PRESETS } from '../dockerfile/presets';
import { DockerfileOp, DockerfileTarget } from '../dockerfile/types';
import { PackageJson } from '../packageJson';

const formatTargetName = (name: string) => {
  return name.replace(/@/g, '_');
};

/**
 * Create dockerfile targets for a node service
 */
export const buildNodeService = ({
  packageJson,
  packageJsonPath,
  dockerfilePath,
  config,
}: {
  packageJson: PackageJson;
  packageJsonPath: string;
  dockerfilePath: string;
  config: {
    workdir: string;
    targetPrefix?: string;
    baseNodeImage: string;

    install: {
      files: (string | [string, string])[];
      /**
       * command to run to install dependencies
       * @example yarn install
       */
      cmd: string | string[];
    };
    build: {
      /**
       * file to copy required for building service
       */
      files: (string | [string, string])[];
      /**
       * @example yarn build
       */
      cmd: string | string[];
    };
    runCmd: string | string[];
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
    from: JQ_PRESETS.as,
    as: `${asPrefix}${pkgName}_extract-deps`,
    comment: `Strip package.json and only keep fields used for installing node_modules`,
    ops: [
      {
        type: 'COPY',
        src: path.relative(dockerfilePath, packageJsonPath),
        dst: `/tmp/package.json`,
      },
      {
        type: 'RUN',
        cmd: `jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json`,
      },
    ],
  };

  const installTarget: DockerfileTarget = {
    from: nodeBaseTarget.as,
    as: `${asPrefix}${pkgName}_install-deps`,
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
      ...config.install.files.map(
        (f): DockerfileOp => ({
          type: 'COPY',
          src: Array.isArray(f) ? f[0] : f,
          dst: Array.isArray(f) ? f[1] : null,
        })
      ),
      {
        type: 'RUN',
        cmd: config.install.cmd,
      },
    ],
  };

  const buildTarget: DockerfileTarget = {
    from: installTarget.as,
    as: `${asPrefix}${pkgName}_build`,
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
      ...config.build.files.map(
        (f): DockerfileOp => ({
          type: 'COPY',
          src: Array.isArray(f) ? f[0] : f,
          dst: Array.isArray(f) ? f[1] : null,
        })
      ),
      {
        type: 'CMD',
        cmd: `${config.build.cmd}`,
      },
    ],
  };

  const runTarget: DockerfileTarget = {
    from: buildTarget.as,
    as: `${asPrefix}${pkgName}`,
    ops: [
      {
        type: 'CMD',
        cmd: `${config.runCmd}`,
      },
    ],
  };

  return {
    targets: [
      JQ_PRESETS,
      nodeBaseTarget,
      extractPackageJsonDepsTarget,
      installTarget,
      buildTarget,
      runTarget,
    ],
  };
};

/**
 * Create dockerfile targets for a service that serve static html
 */
export const buildAppService = ({
  packageJson,
  packageJsonPath,
  dockerfilePath,
  config,
}: {
  packageJson: PackageJson;
  packageJsonPath: string;
  dockerfilePath: string;
  config: {
    workdir: string;
    targetPrefix?: string;
    baseNodeImage: string;

    install: {
      files: (string | [string, string])[];
      /**
       * command to run to install dependencies
       * @example yarn install
       */
      cmd: string | string[];
    };
    build: {
      /**
       * file to copy required for building service
       */
      files: (string | [string, string])[];
      /**
       * @example yarn build
       */
      cmd: string | string[];
      dst: string;
    };
    runCmd: string | string[];
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
    from: JQ_PRESETS.as,
    as: `${asPrefix}${pkgName}_extract-deps`,
    comment: `Strip package.json and only keep fields used for installing node_modules`,
    ops: [
      {
        type: 'COPY',
        src: path.relative(dockerfilePath, packageJsonPath),
        dst: `/tmp/package.json`,
      },
      {
        type: 'RUN',
        cmd: `jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json`,
      },
    ],
  };

  const installTarget: DockerfileTarget = {
    from: nodeBaseTarget.as,
    as: `${asPrefix}${pkgName}_install-deps`,
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
      ...config.install.files.map(
        (f): DockerfileOp => ({
          type: 'COPY',
          src: Array.isArray(f) ? f[0] : f,
          dst: Array.isArray(f) ? f[1] : null,
        })
      ),
      {
        type: 'RUN',
        cmd: config.install.cmd,
      },
    ],
  };

  const buildTarget: DockerfileTarget = {
    from: installTarget.as,
    as: `${asPrefix}${pkgName}_build`,
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
      ...config.build.files.map(
        (f): DockerfileOp => ({
          type: 'COPY',
          src: Array.isArray(f) ? f[0] : f,
          dst: Array.isArray(f) ? f[1] : null,
        })
      ),
      {
        type: 'CMD',
        cmd: `${config.build.cmd}`,
      },
    ],
  };

  const runTarget: DockerfileTarget = {
    from: buildTarget.as,
    as: `${asPrefix}${pkgName}`,
    ops: [
      {
        type: 'CMD',
        cmd: `${config.runCmd}`,
      },
    ],
  };

  return {
    targets: [
      JQ_PRESETS,
      nodeBaseTarget,
      extractPackageJsonDepsTarget,
      installTarget,
      buildTarget,
      runTarget,
    ],
  };
};
