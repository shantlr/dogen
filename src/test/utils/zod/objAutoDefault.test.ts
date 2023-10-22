import z from 'zod';
import { zodAutoDefault } from '../../../lib/utils/zod';

describe('utils zod objAutoDefault', () => {
  describe('it should transform null to defaul value', () => {
    it('should handle number', () => {
      const schema = zodAutoDefault(z.boolean().default(true).nullable());
      expect(schema.parse(null)).toEqual(true);
    });
    it('should handle number', () => {
      const schema = zodAutoDefault(z.number().default(5).nullable());
      expect(schema.parse(null)).toEqual(5);
    });
    it('should handle string', () => {
      const schema = zodAutoDefault(
        z.string().default('hello world').nullable()
      );
      expect(schema.parse(null)).toEqual('hello world');
    });

    it('should handle empty object', () => {
      const schema = zodAutoDefault(z.object({}).nullable());
      expect(schema.parse(null)).toEqual({});
    });
    it('should handle basic object', () => {
      const schema = zodAutoDefault(
        z
          .object({
            a: z.string().default('he'),
            b: z.boolean().default(true),
            c: z.number().default(5),
            d: z.number(),
          })
          .nullable()
      );
      expect(schema.parse(null)).toEqual({
        a: 'he',
        b: true,
        c: 5,
      });
    });

    it('should handle nested object', () => {
      const schema = zodAutoDefault(
        z
          .object({
            a: z.string().default('he'),
            b: z.object({}).default({ test: 5 }),
            c: z.number().default(5),
            d: z.number(),
            e: z.object({
              1: z.string().default('wo'),
              2: z.object({}),
              3: z.number().default(10),
            }),
          })
          .nullable()
      );
      expect(schema.parse(null)).toEqual({
        a: 'he',
        b: { test: 5 },
        c: 5,
        e: {
          1: 'wo',
          2: {},
          3: 10,
        },
      });
    });
  });

  it('should add default to nullish object (2)', () => {
    const schema = zodAutoDefault(
      z
        .object({
          test: z.number().default(5),
        })
        .nullish()
    );
    expect(schema.parse(undefined)).toEqual({
      test: 5,
    });
  });
  it('should add default to nullish object (3)', () => {
    const schema = zodAutoDefault(
      z
        .object({
          test: z.number().default(5),
        })
        .nullish()
    );
    expect(schema.parse(null)).toEqual({
      test: 5,
    });
  });

  it('should add default to nullish object (4)', () => {
    const schema = zodAutoDefault(
      z
        .object({
          test: z.number().nullish().default(5),
        })
        .nullish()
    );
    expect(
      schema.parse({
        test: null,
      })
    ).toEqual({
      test: 5,
    });
  });
});
