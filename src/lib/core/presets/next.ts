import { uniq } from 'lodash';
import { packageHasDependency } from '../../packageJson';
import { nodeServicePreset } from './nodeService';
import { filterFilesExists } from '../../utils';

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
