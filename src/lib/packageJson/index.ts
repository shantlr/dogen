import { readFile, stat } from 'fs/promises';
import path from 'path';

export interface PackageJson {
  name: string;
  version: string;

  scripts?: Record<string, string>;

  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export const findPackageJson = async (
  dir: string,
  root: string
): Promise<{
  dir: string;
  packageJson: PackageJson;
}> => {
  try {
    const p = path.resolve(dir, 'package.json');
    await stat(p);
    return {
      dir,
      packageJson: await readFile(p)
        .then((r) => r.toString())
        .then((r) => JSON.parse(r) as PackageJson),
    };
  } catch (err) {
    if (err?.code === 'ENOENT') {
      const parent = path.resolve(dir, '..');
      if (parent !== dir && parent.startsWith(root)) {
        return findPackageJson(parent, root);
      }

      throw new Error('package.json not found');
    }
    throw err;
  }
};
