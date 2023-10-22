import { mapValues } from 'lodash';
import z, {
  ZodDefault,
  ZodEffects,
  ZodNullable,
  ZodObject,
  ZodOptional,
  ZodType,
  ZodTypeAny,
} from 'zod';

type ZodResolvedDefault<T> = T extends ZodDefault<infer D>
  ? z.output<D>
  : T extends ZodObject<infer Shape>
  ? {
      [key in keyof Shape as Shape[key] extends ZodDefault<any> | ZodObject<any>
        ? key
        : never]: ZodResolvedDefault<Shape[key]>;
    }
  : T extends ZodOptional<infer Inner>
  ? ZodResolvedDefault<Inner>
  : T extends ZodNullable<infer Inner>
  ? ZodResolvedDefault<Inner>
  : never;

export const resolveZodDefaultValue = <T extends ZodType>(
  schema: T
): ZodResolvedDefault<T> => {
  if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
    return resolveZodDefaultValue(
      schema._def.innerType
    ) as ZodResolvedDefault<T>;
  }

  if (schema instanceof ZodDefault) {
    return schema._def.defaultValue();
  }
  if (schema instanceof ZodObject) {
    return mapValues(schema.shape, (fieldSchema: ZodTypeAny) => {
      return resolveZodDefaultValue(fieldSchema);
    }) as ZodResolvedDefault<T>;
  }
};

const resolveActualSchema = <T extends ZodTypeAny>(schema: T) => {
  if (schema instanceof ZodOptional || schema instanceof ZodNullable) {
    return resolveActualSchema(schema.unwrap());
  }
  return schema;
};

/**
 *
 */
export const zodAutoDefault = <T extends ZodTypeAny>(
  schema: T
): ZodEffects<T, z.output<T> & ZodResolvedDefault<T>, z.input<T>> => {
  let s: ZodTypeAny = schema;
  const inner = resolveActualSchema(schema);

  if (inner instanceof ZodObject) {
    s = z.object(mapValues(inner.shape, (v) => zodAutoDefault(v)));
    if (schema.isNullable) {
      s = s.nullable();
    }
    if (schema.isOptional()) {
      s = s.optional();
    }
  }

  const defaultValue = resolveZodDefaultValue(schema);
  return s.transform((value) => {
    if (value == null) {
      return defaultValue;
    }
    return value;
  }) as ZodEffects<T, z.output<T> & ZodResolvedDefault<T>, z.input<T>>;
};
