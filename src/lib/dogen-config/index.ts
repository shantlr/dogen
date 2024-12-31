import path from 'path';
import { isFileExists } from '../utils';
import { readFile } from 'fs/promises';
import { DogenConfig } from '../types';
import * as yup from 'yup';

const CONFIG_FILE_NAMES = [{ name: '.dogenrc' }];

const validator = yup.object().shape({
  nodeImage: yup.string(),
  container: yup.object().shape({
    workdir: yup.string(),
  }),
  install: yup.object().shape({
    name: yup.string(),
    keepCache: yup.boolean(),
    npmrc: yup.mixed().oneOf([true, false, yup.string()]),
    cmd: yup.string(),
  }),
  build: yup.object().shape({
    name: yup.string(),
    script: yup.string(),
    cmd: yup.string(),
    includes: yup.mixed().oneOf([yup.string(), yup.array().of(yup.string())]),
    excludes: yup.mixed().oneOf([yup.string(), yup.array().of(yup.string())]),
    extraIncludes: yup
      .mixed()
      .oneOf([yup.string(), yup.array().of(yup.string())]),
  }),
  postBuild: yup.object().shape({
    includes: yup.mixed().oneOf([yup.string(), yup.array().of(yup.string())]),
  }),
  run: yup.object().shape({
    name: yup.string(),
    cmd: yup.string(),
    script: yup.string(),
    expose: yup.number().integer().positive(),
  }),
});

const assertDogenConfig = async (content: DogenConfig) => {
  const warnings: string[] = [];

  const res = await validator.validate(content);
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

export const parseDogenConfig = async (str: string) => {
  const content = JSON.parse(str);
  const { warnings } = await assertDogenConfig(content);
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
