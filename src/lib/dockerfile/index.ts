import { DockerfileOp, DockerfileTarget } from './types';

const formatOp = (op: DockerfileOp): string => {
  switch (op.type) {
    case 'CMD': {
      if (typeof op.cmd === 'string') {
        return `CMD ${op.cmd}`;
      }
      return `CMD [${op.cmd.map((c) => `"${c}"`).join(',')}]`;
    }
    case 'LABEL': {
      return `LABEL "${op.name}"=${op.value}`;
    }
    case 'EXPOSE': {
      return `EXPOSE ${op.port}${op.protocol ? `/${op.protocol}` : ''}`;
    }
    case 'ENV': {
      return `ENV ${op.name}=${op.value}`;
    }
    case 'COPY': {
      return `COPY`;
    }
    case 'RUN': {
      return `RUN`;
    }
    default:
  }
  throw new Error(`Unknown dockerfile op: ${JSON.stringify(op)}`);
};

const generateDockerfileTarget = (target: DockerfileTarget) => {
  const res: string[] = [
    `FROM ${target.from} AS ${target.as}`,
    ...target.ops.map((o) => formatOp(o)),
  ];

  return res.join('\n');
};

export const generateDockerfile = (targets: DockerfileTarget[]): string => {
  return targets.map((t) => generateDockerfileTarget(t)).join('\n\n');
};
