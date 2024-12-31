import { identity } from 'lodash';
import { PackageJson } from '../../package-json';
import { DockerfileOp } from '../../dockerfile/types';

// eslint-disable-next-line @typescript-eslint/ban-types
type FallbackString = string & {};

type PresetTargetNames<Targets, K = keyof Targets> = K extends string | number
  ? `@/${K}`
  : never;

type TargetsDef<
  InputConfig,
  MappedConfig,
  Targets,
  AdditionalTarget extends string = never
> = {
  [targetName in keyof Targets]: {
    comment?: string | string[];
    as?:
      | string
      | ((input: {
          inputConfig: InputConfig;
          config: MappedConfig;
          packageJson: PackageJson;
          projectDir: string;
        }) => string);
    /**
     * You can reference to other local target by starting with '@/'
     * You can reference included presset stage by '@preset-name/@target-key'
     */
    from?:
      | ((input: {
          inputConfig: InputConfig;
          config: MappedConfig;
          packageJson: PackageJson;
          projectDir: string;
        }) => PresetTargetNames<Targets> | AdditionalTarget | FallbackString)
      | PresetTargetNames<Targets>
      | AdditionalTarget
      | FallbackString;
    ops?:
      | DockerfileOp[]
      | ((input: {
          inputConfig: InputConfig;
          config: MappedConfig;
          packageJson: PackageJson;
          projectDir: string;
        }) => DockerfileOp[] | Promise<DockerfileOp[]>);
  };
};

type MapConfig<InputConfig, MappedConfig> = (input: {
  config: InputConfig;
  packageJson: PackageJson;
  projectDir: string;
}) => MappedConfig | Promise<MappedConfig>;
type ShouldUsePreset = (input: {
  projectDir: string;
  packageJson: PackageJson;
}) => boolean | Promise<boolean>;

export interface Preset<InputConfig, MappedConfig, Targets> {
  name: string;
  includes: string[];
  mapConfig: MapConfig<InputConfig, MappedConfig>;
  shouldUsePreset: ShouldUsePreset;
  targets: TargetsDef<InputConfig, MappedConfig, Targets>;

  // extendConfig: <ExtendedConfig extends MappedConfig>(input: {
  //   name?: string;
  // }) => Preset<InputConfig, ExtendedConfig, Targets>;

  extend: <
    ExtendedTargets,
    ExtendedConfig extends MappedConfig = MappedConfig
  >(opt: {
    name: string;
    shouldUsePreset?: ShouldUsePreset;
    mapConfigBefore?: (input: {
      projectDir: string;
      packageJson: PackageJson;
      config: InputConfig;
      preset: Preset<InputConfig, MappedConfig, Targets>;
    }) => InputConfig | Promise<InputConfig>;
    mapConfig?: (input: {
      projectDir: string;
      packageJson: PackageJson;
      inputConfig: InputConfig;
      config: InputConfig;
      preset: Preset<InputConfig, MappedConfig, Targets>;
    }) => MappedConfig | Promise<MappedConfig>;
    mapConfigAfter?: (input: {
      projectDir: string;
      packageJson: PackageJson;
      inputConfig: InputConfig;
      config: MappedConfig;
      preset: Preset<InputConfig, MappedConfig, Targets>;
    }) => ExtendedConfig | Promise<ExtendedConfig>;
    targets?: TargetsDef<InputConfig, ExtendedConfig, ExtendedTargets>;
  }) => Preset<
    InputConfig,
    ExtendedConfig,
    Omit<Targets, keyof ExtendedTargets> & ExtendedTargets
  >;
}
export type AnyPreset = Preset<any, any, any>;

type CreatePresetInput<InputConfig, MappedConfig, Targets> = {
  name: string;
  includes?: string[];
  /**
   * Detemine wether this preset is applicable for project
   */
  shouldUsePreset?: ShouldUsePreset;

  mapConfig?: MapConfig<Record<string, any>, MappedConfig>;

  targets: TargetsDef<InputConfig, MappedConfig, Targets>;
};

export const createPreset = <
  MappedConfig,
  Targets,
  InputConfig = Record<string, any>
>(
  input: CreatePresetInput<InputConfig, MappedConfig, Targets>
): Preset<InputConfig, MappedConfig, Targets> => {
  if (!input.name || !/^[a-z0-9-]+$/.test(input.name)) {
    throw new Error(`invalid preset name: ${input.name}`);
  }
  const preset: Preset<InputConfig, MappedConfig, Targets> = {
    name: input.name,
    includes: input.includes || [],
    mapConfig: input.mapConfig || identity,
    shouldUsePreset: input.shouldUsePreset,
    targets: input.targets,

    extend: (extendInput) => {
      const mapConfig = async (input: {
        projectDir: string;
        packageJson: PackageJson;
        config: InputConfig;
      }) => {
        const inputConfig =
          typeof extendInput.mapConfigBefore === 'function'
            ? await extendInput.mapConfigBefore({ ...input, preset })
            : input.config;
        const mappedConfig = extendInput.mapConfig
          ? await extendInput.mapConfig({
              ...input,
              inputConfig: input.config,
              config: inputConfig,
              preset,
            })
          : await preset.mapConfig({
              ...input,
              config: inputConfig,
            });
        return (
          typeof extendInput.mapConfigAfter === 'function'
            ? extendInput.mapConfigAfter({
                ...input,
                inputConfig,
                config: mappedConfig,
                preset,
              })
            : mappedConfig
        ) as Promise<
          Awaited<ReturnType<(typeof extendInput)['mapConfigAfter']>>
        >;
      };

      return createPreset({
        name: extendInput.name,
        includes: input.includes,
        mapConfig,
        shouldUsePreset: extendInput.shouldUsePreset || input.shouldUsePreset,
        targets: {
          ...input.targets,
          ...extendInput.targets,
          // ...(mapOwnConfig
          //   ? mapValues(targets, ({ ops, from, as, ...target }) => ({
          //       ...target,
          //       as:
          //         typeof as === 'function'
          //           ? async (input) =>
          //               as({
          //                 ...input,
          //                 config: await mapOwnConfig({ ...input }),
          //               })
          //           : as,
          //       from:
          //         typeof from === 'function'
          //           ? async (input) =>
          //               from({
          //                 ...input,
          //                 config: await mapOwnConfig({ ...input }),
          //               })
          //           : from,
          //       ops:
          //         typeof ops === 'function'
          //           ? async (input) =>
          //               ops({
          //                 ...input,
          //                 config: await mapOwnConfig({ ...input }),
          //               })
          //           : ops,
          //     }))
          //   : targets),
        },
      });
    },
  };
  return preset;
};
