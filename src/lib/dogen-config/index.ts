import { readFile } from 'fs/promises';
import path from 'path';

import { cloneDeep, mergeWith } from 'lodash';
import * as v from 'valibot';

import { addDefaultInPlace } from '../core/presets/utils/add-defaults';
import { isFileExists } from '../utils';

import { Appendable, DeepOptional } from './types';

export const CONFIG_FILE_NAMES = [
  { name: '.dogenrc' },
  { name: '.dogenrc.json' },
];

const copyFromSchema = v.object({
  from: v.string(),
  src: v.string(),
  dst: v.string(),
});

const baseSchema = v.object({
  node: v.optional(
    v.object({
      from: v.optional(v.string()),
      setupPackageManagerVersion: v.optional(v.boolean()),
    }),
  ),
  target_prefix: v.optional(v.string()),

  package_manager: v.optional(v.picklist(['npm', 'yarn@1', 'yarn@4'])),

  container: v.optional(
    v.object({
      workdir: v.optional(v.string()),
    }),
  ),

  extract_deps: v.optional(
    v.object({
      jq_image_name: v.optional(v.string()),
      target_name: v.optional(v.string()),
    }),
  ),

  install: v.optional(
    v.object({
      from: v.optional(v.string()),
      target_name: v.optional(v.string()),
      // keep_cache: v.optional(v.boolean()),
      // npmrc: v.optional(v.union(v.string(), v.boolean())),
      cmd: v.optional(v.string()),
    }),
  ),

  build: v.optional(
    v.object({
      target_name: v.optional(v.string()),
      cmd: v.nullish(v.string()),
      script: v.nullish(v.string()),

      output_dir: v.nullish(v.string()),

      src_files: v.nullish(v.array(v.string())),
      src_copy_from: v.nullish(v.array(copyFromSchema)),
      src_additional_files: v.nullish(v.array(v.string())),
      src_detect_additional_files: v.nullish(
        v.array(
          v.union([
            v.string(),
            v.object({
              oneOf: v.array(v.string()),
            }),
          ]),
        ),
      ),

      post_files: v.nullish(v.array(v.string())),
      post_additional_files: v.nullish(v.array(v.string())),
      post_detect_additional_files: v.nullish(v.array(v.string())),
      post_copy_from: v.nullish(v.array(copyFromSchema)),
    }),
  ),

  run: v.optional(
    v.object({
      target_name: v.optional(v.string()),
      cmd: v.optional(v.string()),
      script: v.optional(v.string()),
      expose: v.optional(v.number()),
    }),
  ),

  serve: v.optional(
    v.object({
      from_image: v.optional(v.string()),
      config: v.optional(v.string()),
      config_dst: v.optional(v.string()),

      target_name: v.optional(v.string()),
      cmd: v.optional(v.string()),
      script: v.optional(v.string()),
      expose: v.optional(v.number()),
    }),
  ),
});

export const DOGEN_DEFAULT_CONFIG = {
  node_image: 'node:22-alpine',
  node: {
    from: 'node:22-alpine',
    setupPackageManagerVersion: true,
  },
  container: {
    workdir: '/app',
  },
  extract_deps: {
    target_name: 'extract_deps',
  },
  install: {
    target_name: 'install_modules',
  },
  build: {
    target_name: 'build',
  },
  run: {
    target_name: 'service',
  },
  serve: {
    target_name: 'serve',
  },
};

export type DogenConfig = v.InferOutput<typeof baseSchema>;
export type DogenConfigDeepOptional = DeepOptional<DogenConfig>;
export type DogenConfigAppend = Appendable<DogenConfig>;

export type PackageManagerName = NonNullable<DogenConfig['package_manager']>;

export type ExtendMutateConfig = {
  default?: DogenConfigDeepOptional;
  append?: DogenConfigAppend;
};

const assertDogenConfig = async (content: unknown) => {
  const warnings: string[] = [];

  const parsed = v.parse(baseSchema, content);
  // if (parsed.build?.cmd && parsed.build?.script) {
  //   warnings.push(
  //     `config 'build.script' will be ignored: both 'build.cmd' and 'build.script' has been provided`,
  //   );
  // }
  // if (parsed.run?.cmd && parsed.run?.script) {
  //   warnings.push(
  //     `config 'run.script' will be ignored: both 'run.cmd' and 'run.script' has been provided`,
  //   );
  // }

  return {
    warnings,
    parsed,
  };
};

const parseDogenConfig = async (str: string) => {
  try {
    const content = JSON.parse(str);

    const { parsed, warnings } = await assertDogenConfig(content);
    return {
      config: parsed,
      warnings,
    };
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Failed to parse JSON: ${err.message}`);
    }

    throw err;
  }
};

export const getDogenConfig = async (dir: string) => {
  for (const c of CONFIG_FILE_NAMES) {
    const p = path.resolve(dir, c.name);
    if (await isFileExists(p)) {
      const res = await parseDogenConfig((await readFile(p)).toString());
      return {
        warnings: res.warnings,
        config: res.config,
        isDefault: false as const,
        configPath: p,
      };
    }
  }

  return {
    warnings: [] as string[],
    isDefault: true as const,
    configPath: null,
  };
};

export const applyConfigExtensions = (
  config: DogenConfig | undefined,
  extensions: (ExtendMutateConfig | undefined | null)[],
): DogenConfig => {
  if (!extensions.length) {
    return config ?? {};
  }

  const value = cloneDeep(config ?? {});
  for (const extension of extensions) {
    if (extension?.default) {
      mergeWith(value, extension.default, (objValue, srcValue) => {
        if (
          (typeof objValue !== 'object' && objValue != null) ||
          Array.isArray(objValue) ||
          objValue instanceof Date
        ) {
          return objValue;
        }
      });
    }
    if (extension?.append) {
      appendValuesInPlace(value, extension.append);
    }
  }

  return value;
};

function appendValuesInPlace<T>(
  val: T,
  append: Appendable<T> | undefined | null,
) {
  if (!append) {
    return val;
  }

  if (typeof append === 'object' && append) {
    for (const [key, value] of Object.entries(append)) {
      if (Array.isArray(value)) {
        if (Array.isArray(val[key as keyof T])) {
          (val[key as keyof T] as unknown[]).push(...value);
        } else if (val[key as keyof T] === undefined) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          val[key as keyof T] = [...value];
        }
      } else if (value && typeof value === 'object') {
        if (val[key as keyof T] === undefined) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          val[key as keyof T] = {};
        }
        appendValuesInPlace(val[key as keyof T], value);
      }
    }
  }
}

export const mergeConfigExtensions = (
  extensions: (ExtendMutateConfig | undefined)[],
) => {
  const res: ExtendMutateConfig = {
    default: {},
    append: {},
  };

  for (const extension of extensions) {
    if (extension?.default) {
      addDefaultInPlace(res.default!, extension.default);
    }

    if (extension?.append) {
      appendValuesInPlace(res.append, extension.append);
    }
  }

  return res;
};
