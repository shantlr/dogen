import {
  addSrcFilesBasedOnDeps,
  extendInput,
  jsBuildPreset,
} from '../common/js-build';
import { PresetInput } from '../types';
import { createPreset } from '../utils/create-preset';
import { createTarget } from '../utils/create-target';

export const nodeServicePreset = createPreset({
  name: 'dogen/js/node-service',
  run: async (input: PresetInput<typeof jsBuildPreset>) => {
    const res = await jsBuildPreset.run(
      extendInput(
        input,
        {
          onProjectFound: () => {
            return {
              config: {
                default: {
                  run: {
                    script: 'start',
                  },
                },
              },
            };
          },
        },
        {
          onProjectFound: addSrcFilesBasedOnDeps({
            'drizzle-orm': [
              'drizzle',
              'drizzle.config.ts',
              'drizzle.config.js',
            ],
          }),
        },
      ),
    );
    if (!res.handled) {
      return res;
    }

    const { targets, dogenConfig, packageManager } = res.data;

    return {
      handled: true,
      data: {
        ...res.data,
        targets: {
          ...targets,
          run: createTarget({
            from: targets.build,
            as: dogenConfig.run!.target_name!,
            ops: [
              {
                type: 'CMD',
                cmd:
                  dogenConfig.run!.cmd ??
                  packageManager.runScript(dogenConfig.run!.script!),
              },
              typeof dogenConfig.run!.expose === 'number' && {
                type: 'EXPOSE',
                port: dogenConfig.run!.expose,
              },
            ],
          }),
        },
      },
    };
  },
});
