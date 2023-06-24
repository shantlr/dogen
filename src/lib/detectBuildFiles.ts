import { PackageJson } from './packageJson';
import { DogenResolvedConfig } from './types';
import { filter, flatMap, map } from 'lodash';
import path from 'path';
import { isPathExists } from './utils';

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

const resolveFiles = async (
  relativePaths: string[],
  dir: string,
  excludes: string[]
) => {
  const res = await Promise.all(
    relativePaths.map(async (rel) => {
      const p = path.resolve(dir, rel);
      if (!excludes.some((e) => e.startsWith(p)) && (await isPathExists(p))) {
        return p;
      }
      return null;
    })
  );
  return filter(res);
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
  // TODO: refacto
  // const files = await readdir(dir, { withFileTypes: true });
  const res: string[] = [];

  const excludes = (
    (typeof config.build?.excludes === 'string'
      ? [config.build.excludes]
      : config.build?.excludes) || []
  ).map((e) => path.resolve(dir, e));

  if (config.build?.includes) {
    const includes =
      typeof config.build.includes === 'string'
        ? [config.build.includes]
        : config.build.includes;

    res.push(
      ...includes
        .map((i) => path.resolve(dir, i))
        .filter((i) => !excludes.some((e) => !e.startsWith(i)))
    );
  } else {
    const includes = await Promise.all([
      resolveFiles(defaultIncludes, dir, excludes),
      ...map(depsFiles, async (depFiles, depName) => {
        if (
          packageJson.dependencies?.[depName] ||
          packageJson.devDependencies?.[depName]
        ) {
          return resolveFiles(depFiles, dir, excludes);
        }
        return [];
      }),
    ]);
    res.push(...flatMap(includes));
  }

  // const excludes = Array.isArray(config.build?.excludes)
  //   ? config.build?.excludes
  //   : config.build?.excludes
  //   ? [config.build?.excludes]
  //   : [];

  // if (config.build?.includes) {
  //   // provided build files
  //   const includes =
  //     typeof config.build.includes === 'string'
  //       ? [config.build.includes]
  //       : config.build.includes;
  //   res.push(...includes.filter((i) => !excludes.includes(i)));
  // } else {
  //   // auto detect build files
  //   let includes = ['src'];

  //   forEach(depsFiles, (files, depName) => {
  //     if (
  //       packageJson.devDependencies?.[depName] ||
  //       packageJson?.dependencies?.[depName]
  //     ) {
  //       includes.push(...files);
  //     }
  //   });

  //   includes = uniq(includes);

  //   includes.forEach((i) => {
  //     if (!excludes.includes(i) && files.find((f) => f.name === i)) {
  //       res.push(i);
  //     }
  //   });
  // }

  //#region Extra files
  if (Array.isArray(config.build?.extraIncludes)) {
    config.build.extraIncludes.forEach((f) => {
      if (!res.includes(f)) {
        res.push(f);
      }
    });
  } else if (config.build?.extraIncludes) {
    if (!res.includes(config.build?.extraIncludes)) {
      res.push(config.build?.extraIncludes);
    }
  }
  //#endregion

  return res;
};
