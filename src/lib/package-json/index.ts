import { readFile } from 'fs/promises';
import path from 'path';
import { isFileExists } from '../utils';

export interface PackageJson {
  name: string;
  version: string;
  main?: string;

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
  const p = path.resolve(dir, 'package.json');
  if (await isFileExists(p)) {
    return {
      dir,
      packageJson: await readFile(p)
        .then((r) => r.toString())
        .then((r) => JSON.parse(r) as PackageJson),
    };
  }

  const parent = path.resolve(dir, '..');
  if (parent !== dir && parent.startsWith(root)) {
    return findPackageJson(parent, root);
  }

  throw new Error('package.json not found');
};

export const packageHasDependency = (
  pkg: Pick<PackageJson, 'dependencies' | 'devDependencies'>,
  dep: string | string[]
): boolean => {
  if (typeof dep === 'string') {
    return Boolean(pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]);
  }
  return dep.some((d) =>
    Boolean(pkg.dependencies?.[d] || pkg.devDependencies?.[d])
  );
};
