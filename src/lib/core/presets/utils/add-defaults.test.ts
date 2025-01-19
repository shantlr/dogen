import { addDefaultInPlace } from './add-defaults';

describe('addDefaults', () => {
  it('should add defaults', () => {
    expect(
      addDefaultInPlace(
        {
          num: undefined,
          str: undefined,
          bool: undefined,
          false: undefined,
        },
        {
          num: 1,
          str: 'hello',
          bool: true,
          false: false,
        },
      ),
    ).toEqual({
      num: 1,
      str: 'hello',
      bool: true,
      false: false,
    });
  });

  it('should add nested default', () => {
    expect(
      addDefaultInPlace(
        {
          obj: {
            num: undefined,
            str: undefined,
            bool: undefined,
            false: undefined,
          },
        },
        {
          obj: {
            num: 1,
            str: 'hello',
            bool: true,
            false: false,
          },
        },
      ),
    ).toEqual({
      obj: {
        num: 1,
        str: 'hello',
        bool: true,
        false: false,
      },
    });
  });

  it('should add missing object', () => {
    expect(
      addDefaultInPlace(
        {
          obj: undefined,
        },
        {
          obj: {
            num: 1,
            str: 'hello',
            bool: true,
            false: false,
          },
        },
      ),
    ).toEqual({
      obj: {
        num: 1,
        str: 'hello',
        bool: true,
        false: false,
      },
    });
  });

  it('should not override array', () => {
    expect(
      addDefaultInPlace(
        {
          array_1: [1],
          array_2: [],
        },
        {
          array_1: [1, 2, 3],
          array_2: [1, 2, 3],
        },
      ),
    ).toEqual({
      array_1: [1],
      array_2: [],
    });
  });
});
