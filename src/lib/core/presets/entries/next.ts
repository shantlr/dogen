import { packageHasDependency } from '../../../package-json';
import { composeInput } from '../common/js-build';
import { serveStaticJsBuildPreset } from '../common/serve-static-js-build';
import { PresetInput } from '../types';
import { createPreset } from '../utils/create-preset';

export const nextPreset = createPreset({
  name: 'dogen/js/next',
  run: async (input: PresetInput<typeof serveStaticJsBuildPreset>) => {
    return serveStaticJsBuildPreset.run(
      composeInput(input, {
        onProjectFound: ({ packageJson }) => {
          if (!packageHasDependency(packageJson, 'next')) {
            return {
              skip: { reason: 'next not found' },
            };
          }
        },
        config: {
          append: {
            build: {
              src_detect_additional_files: [
                'next.config.js',
                'postcss.config.js',
                'tailwind.config.js',
                'jest.config.js',
              ],
            },
          },
        },
      }),
    );
  },
});
