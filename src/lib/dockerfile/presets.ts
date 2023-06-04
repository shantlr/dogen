import { DockerfileTarget } from './types';

/**
 * Simple image that has jq installed (https://jqlang.github.io/jq/)
 */
export const JQ_PRESETS: DockerfileTarget = {
  from: 'alpine:3.12',
  as: 'jq',
  ops: [{ type: 'RUN', cmd: 'apk add --update --no-cache jq' }],
};
