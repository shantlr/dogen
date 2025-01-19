import { Debugger } from 'debug';
import { cloneDeep } from 'lodash';

import { ValueOrPromise } from '../../../../ts-utils';
import { copies } from '../../../dockerfile';
import {
  applyConfigExtensions,
  DOGEN_DEFAULT_CONFIG,
  DogenConfig,
  getDogenConfig,
  mergeConfigExtensions,
} from '../../../dogen-config';
import { ExtendMutateConfig } from '../../../dogen-config/types';
import {
  findPackageJson,
  packageHasDependency,
  PackageJson,
} from '../../../package-json';
import {
  filterFilesExists,
  filterFsExists,
  mapToResolvePath,
} from '../../../utils';
import { createPreset } from '../utils/create-preset';
import { createTarget } from '../utils/create-target';

import { jsInstallationPreset } from './js-installation';

export type JSBuildPresetInput = {
  dir: string;
  rootDir: string;
  logger?: Debugger;

  dockerContextRoot?: string;

  config?: ExtendMutateConfig;
  onProjectFound?: (project: {
    dir: string;
    packageJson: PackageJson;
  }) => ValueOrPromise<
    | undefined
    | {
        config?: ExtendMutateConfig;
        skip?:
          | boolean
          | {
              reason?: string;
            };
      }
  >;
  onDogenConfig?: (config: DogenConfig | undefined) => ValueOrPromise<{
    config?: ExtendMutateConfig | undefined;
    skip?:
      | boolean
      | {
          reason?: string;
        };
  }>;
};

export const jsBuildPreset = createPreset({
  name: 'dogen/js/build',
  run: async ({
    dir,
    rootDir,
    dockerContextRoot = rootDir,
    config: configInput,
    onProjectFound,
    onDogenConfig: onDogenConfigDetected,
    logger,
  }: JSBuildPresetInput) => {
    const log = logger?.extend('js-build');
    const configExtensions = [configInput];

    //#region Detect package.json
    const project = await findPackageJson(dir, rootDir);

    if (!project) {
      return {
        handled: false,
        reason: 'package.json not found',
      };
    }

    const onProject = await onProjectFound?.(project);

    if (onProject?.skip) {
      return {
        handled: false,
        reason:
          onProject.skip === true
            ? '<on-project-found-skipped>'
            : onProject.skip.reason,
      };
    } else if (onProject) {
      configExtensions.push(onProject.config);
    }
    //#endregion

    //#region Load dogen config
    const detectedDogen = await getDogenConfig(project.dir);
    if (detectedDogen.warnings) {
      log?.(detectedDogen.warnings.map((w) => `WARN: ${w}`).join('\n'));
    }
    if (detectedDogen.isDefault) {
      log?.('no dogen config found, using default');
    } else {
      log?.(`dogen config found at ${detectedDogen.configPath}`);
    }
    if (onDogenConfigDetected) {
      const onDogen = await onDogenConfigDetected(detectedDogen.config);

      if (onDogen?.skip) {
        return {
          handled: false,
          reason:
            onDogen.skip === true
              ? '<on-dogen-config-skipped>'
              : onDogen.skip.reason,
        };
      } else if (onDogen) {
        configExtensions.push(onDogen.config);
      }
    }
    //#endregion

    //#region Apply config extensions
    const dogenConfig = applyConfigExtensions(detectedDogen.config, [
      ...configExtensions,
      { default: DOGEN_DEFAULT_CONFIG },
    ]);
    //#endregion

    const installPresetRes = await jsInstallationPreset.run({
      project,
      dockerContextRoot,
      dogenConfig,
      logger: log,
    });
    if (!installPresetRes.handled) {
      return {
        handled: false,
        reason: `installation not handled: ${installPresetRes.reason ?? `<unknown-reason>`}`,
      };
    }

    const {
      packageManager,
      targets: {
        install: targetInstall,
        extractDeps: targetExtractPkgDeps,
        jq: targetJq,
        node: targetNode,
      },
    } = installPresetRes.data;

    //#region Build
    const targetBuild = createTarget({
      comment: ['Build'],
      from: targetInstall,
      as: dogenConfig!.build!.target_name!,
      ops: [
        {
          type: 'WORKDIR',
          value: dogenConfig!.container!.workdir!,
        },

        // pre build
        ...copies(
          [
            project.packageJsonPath,
            ...mapToResolvePath(dogenConfig.build?.src_files, project.dir),
            ...mapToResolvePath(
              dogenConfig.build?.src_additional_files,
              project.dir,
            ),

            ...(await filterFsExists(
              [
                ...(packageHasDependency(project.packageJson, 'typescript')
                  ? ['tsconfig.json']
                  : []),
                ...(dogenConfig.build?.src_detect_additional_files ?? []),
              ],
              project.dir,
            )),
          ],
          {
            dockerContextRoot,
            srcRoot: project.dir,
          },
        ),
        ...(dogenConfig?.build?.src_copy_from ?? []).map((f) => ({
          type: 'COPY' as const,
          from: f.from,
          src: f.src,
          dst: f.dst,
        })),

        // build
        ...(dogenConfig?.build?.cmd
          ? [
              {
                type: 'RUN' as const,
                cmd: dogenConfig.build.cmd,
              },
            ]
          : [
              {
                type: 'RUN' as const,
                cmd: packageManager.runScript(
                  dogenConfig?.build?.script ?? 'build',
                ),
              },
            ]),

        // post build
        ...copies(
          [
            ...(dogenConfig.build?.post_files ?? []),
            ...(dogenConfig.build?.post_additional_files ?? []),
            ...(await filterFilesExists(
              dogenConfig.build?.post_detect_additional_files ?? [],
              project.dir,
            )),
          ],
          {
            dockerContextRoot,
            srcRoot: project.dir,
          },
        ),

        ...(dogenConfig?.build?.post_copy_from ?? []).map((f) => ({
          type: 'COPY' as const,
          from: f.from,
          src: f.src,
          dst: f.dst,
        })),
      ],
    });
    //#endregion

    return {
      handled: true,
      data: {
        dogenConfig,
        packageManager,
        dockerfileOutputDir: project.dir,
        targets: {
          jq: targetJq,
          node: targetNode,
          extractDeps: targetExtractPkgDeps,
          install: targetInstall,
          build: targetBuild,
        },
      },
    };
  },
});

/**
 * Helper to compose extend js-build preset input
 *
 * @example
 * ```ts
 * const extendedInput = composeInput(
 *   input,
 *   { config: { default: { ... } } },
 * );
 *
 * return jsBuildPreset.run(extendedInput);
 * ```
 */
export const composeInput = (
  input: JSBuildPresetInput,
  ...addons: Pick<
    JSBuildPresetInput,
    'config' | 'onProjectFound' | 'onDogenConfig'
  >[]
): JSBuildPresetInput => {
  if (!addons.length) {
    return input;
  }

  const res = cloneDeep(input);

  for (const addon of addons) {
    if (addon.config) {
      res.config = mergeConfigExtensions([res.config, addon.config]);
    }

    if (addon.onProjectFound) {
      const prev = res.onProjectFound;
      res.onProjectFound = async (project) => {
        const r = await addon.onProjectFound!(project);
        if (r?.skip) {
          return r;
        }

        const r2 = await prev?.(project);
        if (r2?.skip) {
          return r2;
        }

        return {
          config:
            r?.config || r2?.config
              ? mergeConfigExtensions([r?.config, r2?.config])
              : undefined,
        };
      };
    }

    if (addon.onDogenConfig) {
      const prev = res.onDogenConfig;
      res.onDogenConfig = async (config) => {
        const r = await addon.onDogenConfig!(config);
        if (r?.skip) {
          return r;
        }

        const r2 = await prev?.(config);
        if (r2?.skip) {
          return r2;
        }

        return {
          config:
            r?.config || r2?.config
              ? mergeConfigExtensions([r?.config, r2?.config])
              : undefined,
        };
      };
    }
  }

  return res;
};
