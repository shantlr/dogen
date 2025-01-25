import path from 'path';

import { copies } from '../../../dockerfile';
import { DockerignoreOp } from '../../../dockerfile/types';
import {
  applyConfigExtensions,
  DOGEN_DEFAULT_CONFIG,
  getDogenConfig,
} from '../../../dogen-config';
import { findPackageJson, PackageJson } from '../../../package-json';
import { jsBuildPreset } from '../common/js-build';
import { jsInstallationPreset } from '../common/js-installation';
import { PresetInput, Target } from '../types';
import { createPreset } from '../utils/create-preset';
import { createTarget, prefixTargetsAsInplace } from '../utils/create-target';
import { sectionComment } from '../utils/section-comments';

import { anyJsPreset } from './any-js';

const findWorkspace = async (dir: string, rootDir: string) => {
  const nearestPackageJson = await findPackageJson(dir, rootDir);
  if (!nearestPackageJson) {
    return null;
  }

  if (nearestPackageJson.packageJson.workspaces) {
    return nearestPackageJson;
  }

  const parentProject = await findPackageJson(
    path.resolve(nearestPackageJson.dir, '..'),
  );

  if (!parentProject?.packageJson?.workspaces) {
    return null;
  }

  return parentProject;
};

const getWorkspaceProjects = async (
  workspaceRootDir: string,
  packages: string[],
) => {
  const res: { dir: string; packageJson: PackageJson }[] = [];

  for (const p of packages) {
    const projectDir = path.resolve(workspaceRootDir, p);
    const project = await findPackageJson(projectDir, projectDir);
    if (project) {
      res.push(project);
    }
  }

  return res;
};

const formatPkgNameToServiceName = (pkgName: string) => {
  const match = pkgName.match(/@(?<scope>[^/]+)\/(?<name>[^/]+)?/);
  const name = match ? `` : pkgName;
  return name.replace(/[^a-z0-9]/gi, '');
};

const appendTargets = (
  record: Record<string, Target>,
  toAdd: Record<string, Target>,
  prefix?: string,
) => {
  if (prefix) {
    prefixTargetsAsInplace(toAdd, prefix);
  }
  for (const [name, target] of Object.entries(toAdd)) {
    record[prefix ? `${prefix}${name}` : name] = target;
  }
};

export const yarnWorkspacePreset = createPreset({
  name: 'dogen/js/yarn-workspaces',
  run: async (input: PresetInput<typeof jsBuildPreset>) => {
    const log = input.logger?.extend('yarn-workspace');
    const workspace = await findWorkspace(input.dir, input.rootDir);

    if (!workspace) {
      return {
        handled: false,
        reason: 'no workspace found',
      };
    }

    const packages = await getWorkspaceProjects(
      workspace.dir,
      workspace.packageJson.workspaces?.packages ?? [],
    );

    log?.(`detected at ${workspace.dir}`);
    log?.(`packages detected: ${packages.map((p) => p.dir).join(', ')}`);

    const targets: Record<string, Target> = {};

    const workspaceDetectedDogen = await getDogenConfig(workspace.dir);
    if (workspaceDetectedDogen.isDefault) {
      log?.('no dogen config found, using default');
    } else {
      log?.(`dogen config found at ${workspaceDetectedDogen.configPath}`);
    }

    const workspaceDogenConfig = applyConfigExtensions(
      workspaceDetectedDogen.config,
      [
        {
          default: {
            container: {
              workdir: '/home/node/workspace',
            },
          },
        },
        {
          default: DOGEN_DEFAULT_CONFIG,
        },
      ],
    );

    const dockerignore: DockerignoreOp[] = [];

    // setup workspace root
    //#region workspace root setup
    const workspaceInstallation = await jsInstallationPreset.run({
      dogenConfig: workspaceDogenConfig,
      project: workspace,
      dockerContextRoot: workspace.dir,
      logger: log,
    });

    if (!workspaceInstallation.handled) {
      log?.(
        `[preset:yarn-workspace] workspace ${workspace.dir} not handled: ${workspaceInstallation.reason ?? '<unknown-reason>'}`,
      );
      return {
        handled: false,
        reason: `workspace installation not handled: ${workspaceInstallation.reason ?? `<unknown-reason>`}`,
      };
    }

    workspaceInstallation.data.targets.jq.comments = [
      ...sectionComment('Workspace setup'),
      ...(workspaceInstallation.data.targets.jq.comments ?? []),
    ];
    appendTargets(targets, workspaceInstallation.data.targets, 'workspace_');

    targets['workspace_base'] = createTarget({
      from: workspaceInstallation.data.targets.install,
      as: 'workspace',
      ops: [
        {
          type: 'WORKDIR',
          value: workspaceDogenConfig.container!.workdir!,
        },
        ...copies([workspace.packageJsonPath], {
          dockerContextRoot: workspace.dir,
          srcRoot: workspace.dir,
        }),
      ],
    });
    //#endregion

    //#region Packages
    for (const p of packages) {
      const pkgRelativePath = path.relative(workspace.dir, p.dir);
      const res = await anyJsPreset.run({
        dir: p.dir,
        rootDir: p.dir,
        dockerContextRoot: workspace.dir,
        logger: log?.extend(`${p.packageJson.name}`),
        config: {
          default: {
            package_manager: workspaceInstallation.data.packageManager.name,
            node: {
              from: workspaceInstallation.data.targets.node.as,
              setup_package_manager_version: false,
            },
            container: {
              workdir: path.resolve(
                workspaceDogenConfig.container!.workdir!,
                pkgRelativePath,
              ),
            },
            extract_deps: {
              jq_image_name: workspaceInstallation.data.targets.jq.as,
            },
            install: {
              from: targets['workspace_base'].as,
            },
          },
        },
      });
      if (!res.handled) {
        console.warn(
          `[preset:yarn-workspace] package ${p.dir} not handled: ${res.reason ?? '<unknown-reason>'}`,
        );
        continue;
      }

      dockerignore.push(...(res.data.dockerignore ?? []));

      const firstKey = Object.keys(res.data.targets)[0];
      if (firstKey && res.data.targets[firstKey]) {
        res.data.targets[firstKey].comments = [
          ...sectionComment(`Package: ${p.packageJson.name}`),
          ...(res.data.targets[firstKey].comments ?? []),
        ];
      }

      appendTargets(
        targets,
        res.data.targets,
        `${formatPkgNameToServiceName(p.packageJson.name)}_`,
      );
    }
    //#endregion

    return {
      handled: true,
      data: {
        targets,
        dockerfileOutputDir: workspace.dir,
        dockerignore,
      },
    };
  },
});
