import path from 'path';

import { uniq } from 'lodash';

import { DockerfileOp, DockerfileTarget, DockerfileTargetRef } from './types';

const formatTargetRef = (ref: DockerfileTargetRef): string => {
  if (
    ref &&
    typeof ref === 'object' &&
    'as' in ref &&
    typeof ref.as === 'string'
  ) {
    return ref.as;
  }

  if (typeof ref === 'string') {
    return ref;
  }

  throw new Error(`Cannot format target ref: ${JSON.stringify(ref)}`);
};

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
      return `ENV ${Object.entries(op.values)
        .map(([name, value]) => `${name}=${value}`)
        .join(' ')}`;
    }
    case 'COPY': {
      const params = [];

      if (op.from) {
        params.push(`--from=${formatTargetRef(op.from)}`);
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
          }`,
        );
      });

      if (typeof op.cmd === 'string') {
        params.push(op.cmd);
      } else {
        params.push(
          `[${op.cmd.map((c) => `"${c.replace(/\n/g, '\\\n')}"`).join(',')}]`,
        );
      }

      return `RUN ${params.join(' ')}`;
    }
    case 'WRITE_FILE': {
      return `COPY <<-"EOT" ${op.dst}\n${op.content}\nEOT`;
    }
    default:
  }
  throw new Error(`Unknown dockerfile op: ${JSON.stringify(op)}`);
};

const formatDockerfileTarget = (target: DockerfileTarget) => {
  const res: string[] = [];

  if (target.comment) {
    const c =
      typeof target.comment === 'string'
        ? target.comment
        : target.comment.join('\n');
    res.push(...c.split('\n').map((line) => `# ${line}`));
  }

  res.push(
    `FROM ${formatTargetRef(target.from)} AS ${target.as}`,
    ...target.ops.map((o) => formatOp(o)),
  );

  return res.join('\n');
};

export const formatDockerfile = (targets: DockerfileTarget[]): string => {
  return targets.map((t) => formatDockerfileTarget(t)).join('\n\n');
};

export const copy = (
  p: string | [string, string],
  fromPath?: string,
): DockerfileOp & { type: 'COPY' } => {
  const src = Array.isArray(p) ? p[0] : p;

  return {
    type: 'COPY',
    src: fromPath && src.startsWith('/') ? path.relative(fromPath, src) : src,
    dst: Array.isArray(p) ? p[1] : undefined,
  };
};

export const copies = (
  files: string[],
  {
    dockerContextRoot,
    srcRoot,
  }: {
    dockerContextRoot?: string;
    srcRoot?: string;
  } = {},
) => {
  return uniq(files).map(
    (f): DockerfileOp => ({
      type: 'COPY',
      src:
        dockerContextRoot && f.startsWith(dockerContextRoot)
          ? path.relative(dockerContextRoot, f)
          : f,
      dst: srcRoot ? path.relative(srcRoot, f) : f,
    }),
  );
};
