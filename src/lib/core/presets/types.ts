import { ValueOrPromise } from '../../../ts-utils';
import {
  DockerignoreOp,
  DockerfileOp,
  DockerfileTargetGetName,
  DockerfileTargetRef,
} from '../../dockerfile/types';

export type Target = {
  /**
   * Comment to append right before the target definition
   */
  comments?: string[];
  from: DockerfileTargetRef;
  as: string;
  ops?: (DockerfileOp | undefined | null | false)[];
  [DockerfileTargetGetName]: () => string;
};

export type AnyPresetOutput = {
  targets: Record<PropertyKey, Target>;
  dockerignore?: DockerignoreOp[];
};

export type Preset<
  Name extends string,
  Input,
  Output extends AnyPresetOutput,
> = {
  name: Name;
  run: (input: Input) => ValueOrPromise<
    | {
        handled: false;
        reason?: string;
      }
    | {
        handled: true;
        data: Output;
      }
  >;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPreset = Preset<any, any, AnyPresetOutput>;

export type PresetInput<P extends AnyPreset> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends Preset<any, infer Input, any> ? Input : never;

export type PresetOutput<P extends AnyPreset> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends Preset<any, any, infer Output> ? Output : never;
