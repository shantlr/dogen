import { packageHasDependency } from '../../../package-json';
import { composeInput } from '../common/js-build';
import { serveStaticJsBuildPreset } from '../common/serve-static-js-build';
import { PresetInput } from '../types';
import { createPreset } from '../utils/create-preset';

export const createReactAppPreset = createPreset({
  name: 'dogen/js/create-react-app',
  run: async (input: PresetInput<typeof serveStaticJsBuildPreset>) => {
    return serveStaticJsBuildPreset.run(
      composeInput(input, {
        onProjectFound: ({ packageJson }) => {
          if (!packageHasDependency(packageJson, 'react-scripts')) {
            return {
              skip: { reason: 'react-scripts not found' },
            };
          }
        },
        config: {
          default: {
            build: {
              output_dir: 'build',
            },
          },
          append: {
            build: {
              src_detect_additional_files: ['public'],
            },
          },
        },
      }),
    );
  },
});
