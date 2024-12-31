import { DepGraph } from 'dependency-graph';
import { DockerfileTarget } from '../dockerfile/types';
import { PackageJson } from '../package-json';
import { AnyPreset } from './presets/create-preset';
import { keyBy } from 'lodash';

/**
 * fill graph with presets dependencies
 * used to determine targets definition order and presets that are expected to be included in final dockerfile
 */
const fillPresetDepsGraph = ({
  graph,
  node,
  allPresets,
}: {
  graph: DepGraph<AnyPreset>;
  node: AnyPreset;
  allPresets: Record<string, AnyPreset>;
}) => {
  if (graph.hasNode(node.name)) {
    return graph;
  }

  graph.addNode(node.name, node);
  node.includes.forEach((include) => {
    if (!(include in allPresets)) {
      throw new Error(
        `preset '${node.name}' require '${include}' but not found`
      );
    }
    fillPresetDepsGraph({
      graph,
      node: allPresets[include],
      allPresets,
    });
    graph.addDependency(node.name, include);
  });
};
const resolvePresetsToInclude = ({
  root,
  allPresets,
}: {
  root: AnyPreset;
  allPresets: Record<string, AnyPreset>;
}) => {
  const graph = new DepGraph<AnyPreset>();
  fillPresetDepsGraph({ graph, node: root, allPresets });

  const order = graph.overallOrder();
  const presets = order.map((c) => graph.getNodeData(c));

  const targetAliases: Record<string, string> = {};
  presets.forEach((preset) => {
    for (const [target] of Object.entries(preset.targets)) {
      targetAliases[`@${preset.name}/${target}`] = '';
    }
  });

  return {
    presets,
    targetAliases,
  };
};

/**
 * Replace target ref (starting with '@') with resolved name
 */
const replaceTargetsRef = (
  target: DockerfileTarget,
  aliases: Record<string, string>,
  opt?: { assertInvalidRef?: boolean }
) => {
  if (typeof target.from === 'string') {
    if (target.from in aliases) {
      target.from = aliases[target.from];
    } else if (opt?.assertInvalidRef && target.from.startsWith('@')) {
      throw new Error(
        `Could not find target ${target.from} used in '${target.as}'`
      );
    }
  }

  target.ops.forEach((op) => {
    if (op.type === 'COPY' && typeof op.from === 'string') {
      if (op.from in aliases) {
        op.from = aliases[op.from];
      } else if (opt?.assertInvalidRef && op.from.startsWith('@')) {
        throw new Error(
          `Could not find target '${op.from}' used in '${target.as}'`
        );
      }
    }
  });
};

export const presetToDockerfileTargets = async (
  usedPreset: AnyPreset,
  opt: {
    config: Record<string, any>;
    projectDir: string;
    packageJson: PackageJson;
    includable: AnyPreset[];
  }
) => {
  const { presets, targetAliases } = resolvePresetsToInclude({
    root: usedPreset,
    allPresets: keyBy([usedPreset, ...opt.includable], 'name') as Record<
      string,
      AnyPreset
    >,
  });

  const res: DockerfileTarget[] = [];
  for (const preset of presets) {
    const config = preset.mapConfig ? await preset.mapConfig(opt) : opt.config;
    const input = {
      config,
      inputConfig: opt.config,
      projectDir: opt.projectDir,
      packageJson: opt.packageJson,
    };

    const localTargetAliases = {};
    const presetTargets: DockerfileTarget[] = [];

    for (const [key, target] of Object.entries(preset.targets)) {
      const t: DockerfileTarget = {
        comment: target.comment,
        as: typeof target.as === 'function' ? target.as(input) : target.as,
        from:
          typeof target.from === 'function' ? target.from(input) : target.from,
        ops: (
          (typeof target.ops === 'function'
            ? await target.ops(input)
            : target.ops) ?? []
        ).filter((o) => o),
      };
      presetTargets.push(t);
      localTargetAliases[`@/${key}`] = t.as;
      targetAliases[`@${preset.name}/${key}`] = t.as;
    }
    presetTargets.forEach((target) => {
      replaceTargetsRef(target, localTargetAliases);
    });

    res.push(...presetTargets);
  }

  res.forEach((target) => {
    replaceTargetsRef(target, targetAliases, {
      assertInvalidRef: true,
    });
  });

  return res;
};
