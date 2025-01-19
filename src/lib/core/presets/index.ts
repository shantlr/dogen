import { Debugger } from 'debug';

import { anyJsPreset } from './entries/any-js';
import { yarnWorkspacePreset } from './entries/yarn-workspaces';
import { Preset, Target } from './types';
import { createPreset } from './utils/create-preset';

const presets: Preset<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  {
    /**
     * Directory from which to start the preset detection
     */
    dir: string;
    /**
     * Root directory the preset can go up to during detection
     */
    rootDir: string;
    logger?: Debugger;
  },
  {
    targets: Record<string, Target>;
    dockerfileOutputDir: string;
  }
>[] = [yarnWorkspacePreset, anyJsPreset];

export const detectPreset = createPreset({
  name: 'dogen/detect',
  run: async (input: { dir: string; rootDir: string; logger?: Debugger }) => {
    const unmatchedReasons: string[] = [];
    for (const preset of presets) {
      const res = await preset.run(input);
      if (res.handled) {
        return res;
      } else {
        unmatchedReasons.push(
          `[${preset.name}=${res.reason ?? '<unknown-reason>'}]`,
        );
      }
    }

    return {
      handled: false,
      reason: `no preset matched: ${unmatchedReasons.join(', ')}`,
    };
  },
});
