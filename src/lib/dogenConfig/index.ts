import path from 'path';
import { isFileExists } from '../utils';
import { readFile } from 'fs/promises';
import { DogenInputConfig } from '../types';

const CONFIG_FILE_NAMES = [{ name: '.dogenrc' }];

const assertDogenConfig = (content: DogenInputConfig) => {
  const warnings: string[] = [];
  if (content.build?.cmd && content.build?.script) {
    warnings.push(
      `config 'build.script' will be ignored: both 'build.cmd' and 'build.script' has been provided`
    );
  }
  if (content.run?.cmd && content.run?.script) {
    warnings.push(
      `config 'run.script' will be ignored: both 'run.cmd' and 'run.script' has been provided`
    );
  }

  return {
    warnings,
  };
};

export const parseDogenConfig = (str: string) => {
  const content = JSON.parse(str);
  const { warnings } = assertDogenConfig(content);
  return {
    config: content as DogenInputConfig,
    warnings,
  };
};

export const detectDogenConfig = async (dir: string) => {
  for (const c of CONFIG_FILE_NAMES) {
    const p = path.resolve(dir, c.name);
    if (await isFileExists(p)) {
      const str = (await readFile(p)).toString();
      return parseDogenConfig(str);
    }
  }

  return {
    warnings: [],
    config: null,
  };
};
