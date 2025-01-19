import { stat } from 'fs/promises';
import path from 'path';

import { flattenDeep } from 'lodash';

export const isPathExists = async (path: string) => {
  try {
    await stat(path);
    return true;
  } catch (err) {
    if ((err as { code?: string })?.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
};

export const isFileExists = async (filePath: string) => {
  try {
    const f = await stat(filePath);
    if (f.isFile()) {
      return true;
    }
    throw new Error(`${filePath} is not a file`);
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') {
      return false;
    }
    throw err;
  }
};

export const filterFilesExists = async (files: string[], dir?: string) => {
  if (!files.length) {
    return [];
  }

  const res = await Promise.all(
    files.map(async (f) => {
      const p = dir ? path.resolve(dir, f) : f;
      if (await isFileExists(p)) {
        return f;
      }
      return null;
    }),
  );
  return res.filter((f) => f) as string[];
};

export const filterFsExists = async (
  files: (string | { oneOf: string[] })[],
  dir?: string,
) => {
  if (!files.length) {
    return [];
  }

  const filesToMap = dir ? mapToResolvePath(files, dir) : files;

  return filesToMap.reduce(
    async (acc, f) => {
      if (typeof f === 'string') {
        if (await isPathExists(f)) {
          const res = await acc;
          res.push(f);
          return res;
        }
      } else if (f && typeof f === 'object' && 'oneOf' in f) {
        for (const oneOfFile of f.oneOf) {
          if (await isPathExists(oneOfFile)) {
            const res = await acc;
            res.push(oneOfFile);
            return res;
          }
        }
      }

      return acc;
    },
    Promise.resolve([] as string[]),
  );
};

export const mapToResolvePath = <
  T extends string | (string | { oneOf: string[] }),
>(
  files: T[] | undefined | null,
  relativeDir: string,
): T[] => {
  if (!files) {
    return [];
  }

  return files.map((f) => {
    if (typeof f === 'string') {
      return path.resolve(relativeDir, f);
    }
    if (typeof f === 'object' && 'oneOf' in f) {
      return {
        oneOf: f.oneOf.map((oneOfFile) => path.resolve(relativeDir, oneOfFile)),
      };
    }
  }) as T[];
};

export type StringOrDeepStringArray =
  | string
  | string[]
  | StringOrDeepStringArray[];
export const flatJoin = (value: StringOrDeepStringArray, sep: string) => {
  if (typeof value === 'string') {
    return value;
  }
  return flattenDeep(value).join(sep);
};

/**
 * Format command string, if any values is falsy, returned value will be null
 */
export function fcmd(str: string): string | null;
export function fcmd(
  str: TemplateStringsArray,
  ...values: (null | undefined | false | string | number | Date)[]
): string | null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fcmd(strs: string | TemplateStringsArray, ...values: any[]) {
  if (typeof strs === 'string') {
    return strs;
  }

  let res = '';

  for (let i = 0; i < strs.length; i += 1) {
    res += strs[i];
    if (i < values.length) {
      if (!values[i]) {
        return null;
      }
      res += values[i];
    }
  }
  return res;
}
