import z from 'zod';
import { resolveZodDefaultValue } from '../../../lib/utils/zod';

describe('utils zod resolveZodDefaultValue', () => {
  it('should resolve boolean default', () => {
    expect(resolveZodDefaultValue(z.boolean().default(true))).toBe(true);
    expect(resolveZodDefaultValue(z.boolean().default(false))).toBe(false);
  });
  it('should resolve string default', () => {
    expect(resolveZodDefaultValue(z.string().default('hello'))).toBe('hello');
  });
  it('should resolve object with default', () => {
    expect(
      resolveZodDefaultValue(z.object({}).default({ test: 'hello' }))
    ).toEqual({ test: 'hello' });
  });

  it('should resolve object default (1)', () => {
    expect(resolveZodDefaultValue(z.object({}))).toEqual({});
  });
  it('should resolve object default (2)', () => {
    expect(
      resolveZodDefaultValue(
        z.object({
          test: z.string().default('hello'),
          bool: z.boolean().default(true),
          nb: z.number().default(5),
          hello: z.string(),
          world: z.number(),
        })
      )
    ).toEqual({
      test: 'hello',
      bool: true,
      nb: 5,
    });
  });

  it('should resolve object default (3)', () => {
    expect(
      resolveZodDefaultValue(
        z.object({
          test: z.string().default('hello'),
          bool: z.boolean().default(true),
          nb: z.number().default(5),
          nested: z.object({
            field: z.string().default('lorem'),
          }),
          obj: z.object({}),
        })
      )
    ).toEqual({
      test: 'hello',
      bool: true,
      nb: 5,
      nested: {
        field: 'lorem',
      },
      obj: {},
    });
  });

  it('should resolve optional object default', () => {
    expect(
      resolveZodDefaultValue(
        z
          .object({
            test: z.number().default(5),
          })
          .optional()
      )
    ).toEqual({
      test: 5,
    });
  });

  it('should resolve nullable object default', () => {
    expect(
      resolveZodDefaultValue(
        z
          .object({
            test: z.number().default(5),
          })
          .nullable()
          .optional()
      )
    ).toEqual({
      test: 5,
    });
  });
});
