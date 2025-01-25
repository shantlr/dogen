import { readFile, writeFile } from 'fs/promises';
import path from 'path';

import { findIndex, map } from 'lodash';

import { Target } from './core/presets/types';
import { formatDockerfile, formatDockerignore } from './dockerfile';
import { DockerfileTarget, DockerignoreOp } from './dockerfile/types';
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

const writeDogenContent = async ({
  outputPath,
  content,
  mode,
}: {
  outputPath: string;
  content: string;
  mode: 'overwrite' | 'append';
}): Promise<{
  operation: 'created' | 'updated';
}> => {
  let operation: 'created' | 'updated';
  const alreadyExists = await isFileExists(outputPath);

  if (!alreadyExists || mode === 'overwrite') {
    await writeFile(outputPath, content);
    if (alreadyExists) {
      operation = 'updated';
    } else {
      operation = 'created';
    }
  } else if (alreadyExists && mode === 'append') {
    operation = 'updated';
    let currentContent = removeGeneratedDockerfileDogenRange(
      (await readFile(outputPath)).toString(),
    );
    if (!currentContent) {
      currentContent = content;
    } else if (currentContent.endsWith('\n\n')) {
      currentContent += content;
    } else {
      currentContent += `\n${content}`;
    }
    await writeFile(outputPath, currentContent);
  } else {
    throw new Error(`DOCKERFILE_ALREADY_EXISTS`);
  }

  return {
    operation,
  };
};

export const generateDockerfile = async ({
  targets,
  dockerignore,
  outputDir,
  mode = 'append',
}: {
  targets: Record<string, Target>;
  dockerignore?: DockerignoreOp[];
  outputDir: string;
  mode?: 'overwrite' | 'append';
}) => {
  const dockerfileTargets: DockerfileTarget[] = map(targets, (t) => ({
    ...t,
    ops: t.ops?.filter((op) => op != null && op !== false) ?? [],
  }));
  const dockerfile = formatDockerfile(dockerfileTargets);

  //#region Write/Append Dockerfile
  const dockerfilePath = path.resolve(outputDir, 'Dockerfile');

  const content = `${START_REGION}\n${dockerfile}\n${END_REGION}\n`;
  const operation = await writeDogenContent({
    content,
    outputPath: dockerfilePath,
    mode,
  });
  //#endregion

  if (dockerignore) {
    const dockerignorePath = path.resolve(outputDir, '.dockerignore');
    const content = formatDockerignore(dockerignore);
    await writeDogenContent({
      content,
      outputPath: dockerignorePath,
      mode: 'overwrite',
    });
  }

  return {
    operation,
    dockerfilePath,
  };
};
