export type DockerfileTarget = {
  from: string | DockerfileTarget;
  as: string;
  comment?: string;
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
      name: string;
      value: string;
    }
  | {
      type: 'COPY';
      from?: string | DockerfileTarget;
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
    };

export type DockrefileOps = {
  [key in DockerfileOp['type']]: DockerfileOp & { type: key };
};
