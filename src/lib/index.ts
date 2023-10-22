import path from 'path';
import { findPackageJson } from './packageJson';
import { readFile, writeFile } from 'fs/promises';
import { formatDockerfile } from './dockerfile';
import { isFileExists } from './utils';
import { detectDogenConfig } from './dogenConfig';
import { presetToDockerfileTargets } from './core';
import { AnyPreset } from './core/presets/createPreset';
import { allPresets, defaulPresets } from './core/presets';
import { findIndex } from 'lodash';

const START_REGION = '#>>dogen';
const END_REGION = '#<<dogen';

const removeDogenRange = (content: string) => {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((l) => l === START_REGION);
  if (startIdx === -1) {
    return content;
  }
  const endIdx = findIndex(lines, (l) => l === END_REGION, startIdx);

  if (endIdx === -1) {
    throw new Error(
      `Found dogen start region on line '${startIdx}' but did not find end region ('${END_REGION}')`
    );
  }

  // remove region
  lines.splice(startIdx, endIdx - startIdx + 1);

  return lines.join('\n');
};

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

  presets?: AnyPreset[];
  includablePresets?: AnyPreset[];
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

  const content = `${START_REGION}\n${dockerfile}\n${END_REGION}\n`;

  if (!alreadyExists || dockerfileConflict === 'overwrite') {
    await writeFile(dockerfilePath, content);
    if (alreadyExists) {
      operation = 'updated';
    } else {
      operation = 'created';
    }
  } else if (alreadyExists && dockerfileConflict === 'append') {
    operation = 'updated';
    let currentContent = removeDogenRange(
      (await readFile(dockerfilePath)).toString()
    );
    if (!currentContent) {
      currentContent = content;
    } else if (currentContent.endsWith('\n')) {
      currentContent += content;
    } else {
      currentContent += `\n${content}`;
    }
    await writeFile(dockerfilePath, currentContent);
  } else {
    throw new Error(`DOCKERFILE_ALREADY_EXISTS`);
  }
  //#endregion

  return {
    operation,
    dockerfilePath,
  };
};
