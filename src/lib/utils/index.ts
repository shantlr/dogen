import { stat } from 'fs/promises';
import { flattenDeep } from 'lodash';
import path from 'path';

export const isPathExists = async (path: string) => {
  try {
    await stat(path);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
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
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
};

export const filterFilesExists = async (files: string[], dir?: string) => {
  const res = await Promise.all(
    files.map(async (f) => {
      const p = dir ? path.resolve(dir, f) : f;
      if (await isFileExists(p)) {
        return f;
      }
      return null;
    })
  );
  return res.filter((f) => f) as string[];
};

export const isSubPath = (refPath: string, p: string) => {
  if (refPath === p) {
    return false;
  }
  const ref = refPath.split('/');
  const other = p.split('/');
  if (ref.length > other.length) {
    return false;
  }

  for (let i = 0; i < ref.length; i += 1) {
    if (ref[i] !== other[i]) {
      return false;
    }
  }
  return true;
};

export const isSameOrSubPath = (refPath: string, p: string) => {
  if (refPath === p) {
    return true;
  }
  return isSubPath(refPath, p);
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
export function fcmd(strs, ...values) {
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
