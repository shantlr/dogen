import {
  GenericSchema,
  getDefaults,
  object,
  ObjectEntries,
  optional,
} from 'valibot';

export const autoDeepOptional = <T extends GenericSchema>(schema: T) => {
  return optional(schema, getDefaults(schema));
};

export const objectAutoDefaults = <TEntries extends ObjectEntries>(
  entries: TEntries,
) => {
  const schema = object(entries);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return optional(object(entries), getDefaults(schema) as any);
};
