export type ValueOrPromise<T> = T | Promise<T>;

type Identity<T> = T;
export type Pretty<T> = Identity<{
  [K in keyof T]: T[K];
}>;
