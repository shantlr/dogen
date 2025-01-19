import { createPreset } from '../utils/create-preset';
import { createTarget } from '../utils/create-target';

/**
 * Small helper that provide an alpine image with jq installed
 */
export const jqPreset = createPreset({
  name: 'dogen/common/jq',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run: async (input: Record<never, never>) => {
    return {
      handled: true,
      data: {
        targets: {
          jq: createTarget({
            from: 'alpine:3.12',
            as: 'jq',
            ops: [{ type: 'RUN', cmd: 'apk add --update --no-cache jq' }],
          }),
        },
      },
    };
  },
});
