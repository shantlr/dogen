import { PackageJson } from './packageJson';
import { DogenResolvedConfig } from './types';
import { filter, flatMap, map } from 'lodash';
import path from 'path';
import { isPathExists, isSameOrSubPath, isSubPath } from './utils';

export const depsFiles: {
  [depName: string]: string[];
} = {
  typescript: ['tsconfig.json'],
  vite: ['public', 'vite.config.ts', 'vite.config.js', 'tsconfig.node.json'],
  'react-scripts': ['public'],
  prettier: ['.prettierrc'],
  eslint: [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc.json',
  ],
};

const defaultIncludes = ['src'];

const resolveFiles = async ({
  includes,
  dir,
  excludes,
  checkExists,
}: {
  checkExists?: boolean;
  includes: string[];
  dir: string;
  excludes: string[];
}) => {
  const res = await Promise.all(
    includes.map(async (rel) => {
      const p = path.resolve(dir, rel);
      if (
        !excludes.some((e) => isSameOrSubPath(e, p)) &&
        (!checkExists || (await isPathExists(p)))
      ) {
        return p;
      }
      return null;
    })
  );
  return filter(res);
};

const assertNoSpecificExcludes = ({
  includes,
  excludes,
}: {
  includes: string[];
  excludes: string[];
}) => {
  const subPaths = excludes.reduce((acc, e) => {
    const conflict = includes.find((i) => isSubPath(i, e));
    if (conflict) {
      acc.push({
        exclude: e,
        include: conflict,
      });
    }
    return acc;
  }, []);

  if (subPaths.length) {
    throw new Error(
      `Excludes more specific than includes is unhandled:\n${subPaths
        .map(
          (e) =>
            `\t - exclude=${e.exclude} cannot be more specific than include=${e.include}`
        )
        .join(
          '\n'
        )}\nYou should either use .dockerignore or use more specific includes`
    );
  }
};

export const detectBuildFiles = async ({
  config,
  dir,
  packageJson,
}: {
  dir: string;
  packageJson: PackageJson;
  config: Pick<DogenResolvedConfig, 'build'>;
}) => {
  const res: string[] = [];

  const excludes = (
    (typeof config.build?.excludes === 'string'
      ? [config.build.excludes]
      : config.build?.excludes) || []
  ).map((e) => path.resolve(dir, e));

  if (config.build?.includes) {
    const includes = (
      typeof config.build.includes === 'string'
        ? [config.build.includes]
        : config.build.includes
    ).map((p) => path.resolve(dir, p));

    assertNoSpecificExcludes({ includes, excludes });

    res.push(
      ...(await resolveFiles({ includes, dir, excludes, checkExists: true }))
    );
  } else {
    const includes = await Promise.all([
      resolveFiles({
        includes: defaultIncludes,
        dir,
        excludes,
        checkExists: true,
      }),
      ...map(depsFiles, async (depFiles, depName) => {
        if (
          packageJson.dependencies?.[depName] ||
          packageJson.devDependencies?.[depName]
        ) {
          return resolveFiles({
            includes: depFiles,
            dir,
            excludes,
            checkExists: true,
          });
        }
        return [];
      }),
    ]);
    res.push(...flatMap(includes));
  }

  //#region Extra files
  if (config.build?.extraIncludes) {
    const includes =
      typeof config.build.extraIncludes === 'string'
        ? [config.build.extraIncludes]
        : config.build.extraIncludes;

    res.push(
      ...(await resolveFiles({
        includes,
        dir,
        excludes,
        checkExists: false,
      }))
    );
  }
  //#endregion

  return res;
};
