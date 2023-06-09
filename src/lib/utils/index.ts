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
