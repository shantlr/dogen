import { packageHasDependency } from '../../../package-json';
import { extendInput } from '../common/js-build';
import { serveStaticJsBuildPreset } from '../common/serve-static-js-build';
import { PresetInput } from '../types';
import { createPreset } from '../utils/create-preset';

export const vitePreset = createPreset({
  name: 'dogen/js/vite',
  run: async (input: PresetInput<typeof serveStaticJsBuildPreset>) => {
    return serveStaticJsBuildPreset.run(
      extendInput(input, {
        onProjectFound: ({ packageJson }) => {
          if (!packageHasDependency(packageJson, 'vite')) {
            return {
              skip: { reason: 'vite not found' },
            };
          }
        },
        config: {
          default: {
            build: {
              output_dir: 'dist',
            },
          },
          append: {
            build: {
              src_detect_additional_files: [
                'public',
                'vite.config.ts',
                'vite.config.js',
                'tsconfig.node.json',
              ],
            },
          },
        },
      }),
    );
  },
});
