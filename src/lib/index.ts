import path from 'path';
import { findPackageJson } from './packageJson';
import { appendFile, writeFile } from 'fs/promises';
import { formatDockerfile } from './dockerfile';
import { isFileExists } from './utils';
import { detectDogenConfig } from './dogenConfig';
import { presetToDockerfileTargets } from './core';
import { Preset } from './core/presets/createPreset';
import { allPresets, defaulPresets } from './core/presets';

export const generateDockerfile = async ({
  dir = process.cwd(),
  rootDir = process.env.HOME ?? '/',
  dockerfileConflict,
  config: customConfig,
  presets = defaulPresets,
  mapConfig,
  includablePresets = allPresets,
}: {
  dir?: string;
  rootDir?: string;
  dockerfileConflict?: 'overwrite' | 'append';

  presets?: Preset<any, any, any>[];
  includablePresets?: Preset<any, any, any>[];
  /**
   * If not provided, will try to autodetect it
   */
  config?: Record<string, any>;
  /**
   * map provided config or autodetected config
   */
  mapConfig?: (
    detectedConfig: Record<string, any>
  ) => Record<string, any> | Promise<Record<string, any>>;
}) => {
  const { dir: projectDir, packageJson } = await findPackageJson(dir, rootDir);

  let inputConfig = customConfig;
  //#region Autodetect config if not provided
  if (!inputConfig) {
    const { config, warnings } = await detectDogenConfig(projectDir);
    inputConfig = config;
    if (warnings.length) {
      console.log(warnings.map((w) => `WARN: ${w}`).join('\n'));
    }
  }
  //#endregion

  const selectedPreset = presets.find((p) =>
    p.shouldUsePreset({ projectDir, packageJson })
  );
  if (!selectedPreset) {
    throw new Error(`NO_COMPATIBLE_PRESET`);
  }

  const config =
    typeof mapConfig === 'function'
      ? await mapConfig(inputConfig)
      : inputConfig;

  const targets = await presetToDockerfileTargets(selectedPreset, {
    config: config ?? {},
    projectDir,
    packageJson,
    includable: includablePresets,
  });
  const dockerfile = formatDockerfile(targets);

  let operation: 'created' | 'updated';

  //#region Write/Append Dockerfile
  const dockerfilePath = path.resolve(projectDir, 'Dockerfile');
  const alreadyExists = await isFileExists(dockerfilePath);

  const content = `#dogen\n${dockerfile}\n#enddogen\n`;

  if (!alreadyExists || dockerfileConflict === 'overwrite') {
    await writeFile(dockerfilePath, content);
    if (alreadyExists) {
      operation = 'updated';
    } else {
      operation = 'created';
    }
  } else if (dockerfileConflict === 'append') {
    operation = 'updated';
    await appendFile(dockerfilePath, `\n${content}`);
  } else {
    throw new Error(`DOCKERFILE_ALREADY_EXISTS`);
  }
  //#endregion

  return {
    operation,
    dockerfilePath,
  };
};
