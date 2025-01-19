import { readFile, writeFile } from 'fs/promises';
import path from 'path';

import { findIndex, map } from 'lodash';

import { Target } from './core/presets/types';
import { formatDockerfile } from './dockerfile';
import { DockerfileTarget } from './dockerfile/types';
import { isFileExists } from './utils';

const START_REGION = '#>>dogen';
const END_REGION = '#<<dogen';

const removeGeneratedDockerfileDogenRange = (content: string) => {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((l) => l === START_REGION);
  if (startIdx === -1) {
    return content;
  }
  const endIdx = findIndex(lines, (l) => l === END_REGION, startIdx);

  if (endIdx === -1) {
    throw new Error(
      `Found dogen start region on line '${startIdx}' but did not find end region ('${END_REGION}')`,
    );
  }

  // remove region
  lines.splice(startIdx, endIdx - startIdx + 1);

  return lines.join('\n');
};

export const generateDockerfile = async ({
  targets,
  outputDir,
  onConflict,
}: {
  targets: Record<string, Target>;
  outputDir: string;
  onConflict?: 'overwrite' | 'append';
}) => {
  const dockerfileTargets: DockerfileTarget[] = map(targets, (t) => ({
    ...t,
    ops: t.ops?.filter((op) => op != null && op !== false) ?? [],
  }));
  const dockerfile = formatDockerfile(dockerfileTargets);

  let operation: 'created' | 'updated';

  //#region Write/Append Dockerfile
  const dockerfilePath = path.resolve(outputDir, 'Dockerfile');
  const alreadyExists = await isFileExists(dockerfilePath);

  const content = `${START_REGION}\n${dockerfile}\n${END_REGION}\n`;

  if (!alreadyExists || onConflict === 'overwrite') {
    await writeFile(dockerfilePath, content);
    if (alreadyExists) {
      operation = 'updated';
    } else {
      operation = 'created';
    }
  } else if (alreadyExists && onConflict === 'append') {
    operation = 'updated';
    let currentContent = removeGeneratedDockerfileDogenRange(
      (await readFile(dockerfilePath)).toString(),
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
