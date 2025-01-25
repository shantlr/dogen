import { DockerignoreOp } from '../../../dockerfile/types';
import { jsBuildPreset } from '../common/js-build';
import { Preset, PresetInput, Target } from '../types';
import { createPreset } from '../utils/create-preset';

import { createReactAppPreset } from './create-react-app';
import { expoWebPreset } from './expo';
import { nodeServicePreset } from './node-service';
import { vitePreset } from './vite';
import { viteNodePreset } from './vite-node';

const presets: Preset<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  PresetInput<typeof jsBuildPreset>,
  {
    targets: Record<PropertyKey, Target>;
    dockerfileOutputDir: string;
    dockerignore?: DockerignoreOp[];
  }
>[] = [
  expoWebPreset,
  createReactAppPreset,

  viteNodePreset,
  vitePreset,

  // Fallback
  nodeServicePreset,
];

export const anyJsPreset = createPreset({
  name: 'dogen/js/any',
  run: async (input: PresetInput<typeof jsBuildPreset>) => {
    for (const preset of presets) {
      const res = await preset.run(input);
      if (res.handled) {
        return res;
      }
    }

    return {
      handled: false,
      reason: 'no preset found',
    };
  },
});
