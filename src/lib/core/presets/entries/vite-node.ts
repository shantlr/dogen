import { packageHasDependency } from '../../../package-json';
import { composeInput, jsBuildPreset } from '../common/js-build';
import { PresetInput } from '../types';
import { createPreset } from '../utils/create-preset';

import { nodeServicePreset } from './node-service';

export const viteNodePreset = createPreset({
  name: 'dogen/js/vite-node',
  run: async (input: PresetInput<typeof jsBuildPreset>) => {
    const res = await nodeServicePreset.run(
      composeInput(input, {
        onProjectFound({ packageJson }) {
          if (!packageHasDependency(packageJson, 'vite-node')) {
            return {
              skip: true,
            };
          }

          return {
            config: {
              append: {
                build: {
                  src_detect_additional_files: [
                    'vite.config.ts',
                    'vite-env.d.ts',
                    'src',
                  ],
                },
              },
            },
          };
        },
      }),
    );

    return res;
  },
});
