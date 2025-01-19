import { cloneDeep, isPlainObject } from 'lodash';

import { DeepOptional } from '../../../dogen-config/types';

export const addDefaultInPlace = <T>(
  a: NonNullable<T>,
  b: DeepOptional<T> | undefined,
) => {
  if (!b) {
    return a;
  }

  for (const [key, value] of Object.entries(b)) {
    const k = key as keyof T;

    if (a[k] === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      a[k] = cloneDeep(value) as any;
      continue;
    }

    const dest = a[k];
    if (dest && isPlainObject(dest)) {
      addDefaultInPlace(dest, value as DeepOptional<typeof dest>);
      continue;
    }

    // no-op as value is already set
  }

  return a;
};
