import { uniq } from 'lodash';
import { packageHasDependency } from '../../packageJson';
import { nodeServicePreset } from './nodeService';
import { filterFilesExists } from '../../utils';
import { readFile } from 'fs/promises';
import path from 'path';
import { baseAppPreset } from './app';

export const nextStaticPreset = baseAppPreset.extend({
  name: 'nextjs-static',
  shouldUsePreset: async ({ packageJson, projectDir }) => {
    if (!packageHasDependency(packageJson, 'next')) {
      return false;
    }
    try {
      const nextConfig = JSON.parse(
        (await readFile(path.resolve(projectDir, 'next.config.js'))).toString()
      );
      return nextConfig.output === 'export';
    } catch (err) {
      return false;
    }
  },
  mapConfigAfter: async ({ config, projectDir }) => {
    config.build.files = uniq([
      ...config.build.files,
      ...(await filterFilesExists(
        [
          'next.config.js',
          'postcss.config.js',
          'tailwind.config.js',
          'jest.config.js',
        ],
        projectDir
      )),
    ]);
    return config;
  },
});

export const nextPreset = nodeServicePreset.extend({
  name: 'nextjs',
  shouldUsePreset: ({ packageJson }) =>
    packageHasDependency(packageJson, 'next'),
  mapConfigAfter: async ({ config, projectDir }) => {
    config.build.files = uniq([
      ...config.build.files,
      ...(await filterFilesExists(
        [
          'next.config.js',
          'postcss.config.js',
          'tailwind.config.js',
          'jest.config.js',
        ],
        projectDir
      )),
    ]);
    return config;
  },
});
