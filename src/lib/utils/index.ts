import { stat } from 'fs/promises';

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

export type StringOrDeepStringArray =
  | string
  | string[]
  | StringOrDeepStringArray[];
export const flatJoin = (value: StringOrDeepStringArray, sep: string) => {
  if (typeof value === 'string') {
    return value;
  }
  return value
    .map((v: string | StringOrDeepStringArray) => flatJoin(v, sep))
    .join(sep);
};

/**
 * Format command string, if any values is falsy, returned value will be null
 * Can be used to
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
