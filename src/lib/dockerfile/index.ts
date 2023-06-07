import { DockerfileOp, DockerfileTarget } from './types';

const formatOp = (op: DockerfileOp): string => {
  switch (op.type) {
    case 'WORKDIR': {
      return `WORKDIR ${op.value}`;
    }
    case 'LABEL': {
      return `LABEL ${op.name}=${op.value}`;
    }
    case 'EXPOSE': {
      return `EXPOSE ${op.port}${op.protocol ? `/${op.protocol}` : ''}`;
    }
    case 'ENV': {
      return `ENV ${op.name}=${op.value}`;
    }
    case 'COPY': {
      const params = [];
      if (typeof op.from === 'string') {
        params.push(`--from=${op.from}`);
      }

      params.push(op.src);
      if (op.dst) {
        params.push(op.dst);
      }
      return `COPY ${params.join(' ')}`;
    }
    case 'CMD': {
      if (typeof op.cmd === 'string') {
        return `CMD ${op.cmd}`;
      }
      return `CMD [${op.cmd.map((c) => `"${c}"`).join(',')}]`;
    }
    case 'RUN': {
      if (typeof op.cmd === 'string') {
        return `RUN ${op.cmd}`;
      }
      return `RUN [${op.cmd.map((c) => `"${c}"`).join(',')}]`;
    }
    default:
  }
  throw new Error(`Unknown dockerfile op: ${JSON.stringify(op)}`);
};

const formatDockerfileTarget = (target: DockerfileTarget) => {
  const res: string[] = [
    `FROM ${
      typeof target.from === 'string' ? target.from : target.from.as
    } AS ${target.as}`,
    ...target.ops.map((o) => formatOp(o)),
  ];

  return res.join('\n');
};

export const formatDockerfile = (targets: DockerfileTarget[]): string => {
  return targets.map((t) => formatDockerfileTarget(t)).join('\n\n');
};
