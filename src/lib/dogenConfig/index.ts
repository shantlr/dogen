import path from 'path';
import { isFileExists } from '../utils';
import { readFile } from 'fs/promises';
import { DogenConfig } from '../types';

const CONFIG_FILE_NAMES = [{ name: '.dogenrc' }];

const assertDogenConfig = (content: DogenConfig) => {
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
    config: content as DogenConfig,
    warnings,
  };
};
export const parseDogenConfigFile = async (filePath: string) => {
  const str = (await readFile(filePath)).toString();
  return parseDogenConfig(str);
};

export const detectDogenConfig = async (dir: string) => {
  for (const c of CONFIG_FILE_NAMES) {
    const p = path.resolve(dir, c.name);
    if (await isFileExists(p)) {
      return parseDogenConfigFile(p);
    }
  }

  return {
    warnings: [],
    config: null,
  };
};
