import { merge } from 'lodash';
import { nodeBuildPreset } from './nodeBuild';
import { z } from 'zod';
import { zodAutoDefault } from '../../utils/zod';

const serviceConfig = z.object({
  run: zodAutoDefault(
    z
      .object({
        targetName: z.string().optional().default('service'),
        cmd: z.string().optional(),
        script: z.string().optional(),
        expose: z.number().optional(),
      })
      .optional()
  ),
});

export const nodeServicePreset = nodeBuildPreset.extend({
  name: 'node-service',
  mapConfigAfter: ({ inputConfig, config }) =>
    merge(config, serviceConfig.parse(inputConfig)),
  targets: {
    run: {
      as: ({ config }) => config.run.targetName,
      from: '@/build',
      ops: ({ config: { install, run } }) => [
        {
          type: 'CMD',
          cmd:
            run.cmd ??
            install.runScript(run.script) ??
            install.runScript('start'),
        },
        typeof run.expose === 'number' && {
          type: 'EXPOSE',
          port: run.expose,
        },
      ],
    },
  },
});
