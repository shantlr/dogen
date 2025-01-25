import { packageHasDependency } from '../../../package-json';
import { extendInput } from '../common/js-build';
import { serveStaticJsBuildPreset } from '../common/serve-static-js-build';
import { PresetInput } from '../types';
import { createPreset } from '../utils/create-preset';

export const expoWebPreset = createPreset({
  name: 'dogen/js/expo-web',
  run: async (input: PresetInput<typeof serveStaticJsBuildPreset>) => {
    const res = await serveStaticJsBuildPreset.run(
      extendInput(input, {
        onProjectFound: ({ packageJson }) => {
          if (!packageHasDependency(packageJson, 'expo')) {
            return {
              skip: true,
            };
          }

          return {
            config: {
              default: {
                build: {
                  output_dir: 'dist',
                  script: 'expo export -p web',
                },
              },
              append: {
                build: {
                  src_additional_files: ['.env.prod'],
                  src_detect_additional_files: [
                    // expo
                    'app.config.js',
                    'metro.config.js',
                    'babel.config.js',
                    'expo-env.d.ts',
                    ...(packageHasDependency(packageJson, 'nativewind')
                      ? [
                          'global.css',
                          'tailwind.config.js',
                          'nativewind.d.ts',
                          'nativewind-env.d.ts',
                        ]
                      : []),

                    'index.js',
                    'app',
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
