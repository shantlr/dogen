import { DockerfileTargetGetName } from '../../../dockerfile/types';
import { Target } from '../types';

export const createTarget = <T extends Target>(
  target: Omit<T, typeof DockerfileTargetGetName>,
): Target => {
  return {
    ...target,
    [DockerfileTargetGetName]: () => target.as,
  };
};

export const prefixTargetsAsInplace = (
  targets: Record<PropertyKey, Target>,
  prefix: string,
): void => {
  for (const [, target] of Object.entries(targets)) {
    target.as = `${prefix}${target.as}`;
  }
};
