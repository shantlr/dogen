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
