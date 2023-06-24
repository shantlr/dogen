import path from 'path';
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
      } else if (op.from?.as) {
        params.push(`--from=${op.from.as}`);
      }

      params.push(op.src);
      if (op.dst) {
        params.push(op.dst);
      } else {
        params.push(op.src);
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
      const params: string[] = [];

      op.mounts?.forEach((m) => {
        params.push(
          `--mount=type=${m.type},id=${m.id},dst=${m.dst}${
            m.readOnly ? `,ro=true` : ''
          }`
        );
      });

      if (typeof op.cmd === 'string') {
        params.push(op.cmd);
      } else {
        params.push(
          `[${op.cmd.map((c) => `"${c.replace(/\n/g, '\\\n')}"`).join(',')}]`
        );
      }

      return `RUN ${params.join(' ')}`;
    }
    case 'WRITE_FILE': {
      return `RUN echo -e -n "${op.content.replace(/\n/g, '\\n\\\n')}" > ${
        op.dst
      }`;
    }
    default:
  }
  throw new Error(`Unknown dockerfile op: ${JSON.stringify(op)}`);
};

const formatDockerfileTarget = (target: DockerfileTarget) => {
  const res: string[] = [];

  if (target.comment) {
    res.push(`# ${target.comment}`);
  }

  res.push(
    `FROM ${
      typeof target.from === 'string' ? target.from : target.from.as
    } AS ${target.as}`,
    ...target.ops.map((o) => formatOp(o))
  );

  return res.join('\n');
};

export const formatDockerfile = (targets: DockerfileTarget[]): string => {
  return targets.map((t) => formatDockerfileTarget(t)).join('\n\n');
};

export const copy = (
  p: string | [string, string],
  fromPath?: string
): DockerfileOp & { type: 'COPY' } => {
  const src = Array.isArray(p) ? p[0] : p;

  return {
    type: 'COPY',
    src: fromPath ? path.relative(fromPath, src) : src,
    dst: Array.isArray(p) ? p[1] : undefined,
  };
};
