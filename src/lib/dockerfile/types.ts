export const DockerfileTargetGetName = Symbol('DockerfileTargetGetName');

export type DockerfileTargetRef =
  | string
  | DockerfileTarget
  | {
      [DockerfileTargetGetName](): string;
    };

export type DockerfileTarget = {
  from: DockerfileTargetRef;
  as: string;
  comment?: string | string[];
  ops: DockerfileOp[];
};

export type DockerfileRunMount = {
  type: 'secret';
  id: string;
  dst: string;
  readOnly?: boolean;
};
export type DockerfileOp =
  | {
      type: 'WORKDIR';
      value: string;
    }
  | {
      type: 'ARG';
      name: string;
      default?: string;
    }
  | {
      type: 'LABEL';
      name: string;
      value: string;
    }
  | {
      type: 'EXPOSE';
      port: number;
      protocol?: 'udp' | 'tcp';
    }
  | {
      type: 'ENV';
      values: Record<string, string>;
    }
  | {
      type: 'COPY';
      from?: DockerfileTargetRef;
      src: string;
      dst?: string;
    }
  | {
      type: 'CMD';
      cmd: string | string[];
    }
  | {
      type: 'RUN';
      cmd: string | string[];
      mounts?: DockerfileRunMount[];
    }
  | {
      type: 'WRITE_FILE';
      content: string;
      dst: string;
    };

export type DockrefileOps = {
  [key in DockerfileOp['type']]: DockerfileOp & { type: key };
};
