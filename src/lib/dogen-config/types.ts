import { DogenConfigDeepOptional, DogenConfigAppend } from '.';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Appendable<T> = T extends any[]
  ? T
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<PropertyKey, any>
    ? {
        [K in keyof T]?: Appendable<T[K]>;
      }
    : never;

export type DeepOptional<T> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<PropertyKey, any>
    ? {
        [K in keyof T]?: DeepOptional<T[K]>;
      }
    : T;
export type ExtendMutateConfig = {
  default?: DogenConfigDeepOptional;
  append?: DogenConfigAppend;
};
