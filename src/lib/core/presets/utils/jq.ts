import { createPreset } from '../create-preset';

export const jqPreset = createPreset({
  name: 'dogen-jq',
  targets: {
    jq: {
      from: 'alpine:3.12',
      as: 'jq',
      ops: [{ type: 'RUN', cmd: 'apk add --update --no-cache jq' }],
    },
  },
});
