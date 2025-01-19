import { object, optional, parse, string } from 'valibot';

import { objectAutoDefaults } from './valibot';

describe('utils/valibot', () => {
  describe('objectAutoDefaults', () => {
    it('should default strin field', () => {
      const schema = objectAutoDefaults({
        hello: optional(string(), 'world'),
      });

      expect(parse(schema, undefined)).toEqual({ hello: 'world' });
    });

    it('should default nested optional', () => {
      const schema = objectAutoDefaults({
        test: object({
          hello: optional(string(), 'world'),
        }),
      });

      expect(parse(schema, undefined)).toEqual({
        test: {
          hello: 'world',
        },
      });
    });
  });
});
