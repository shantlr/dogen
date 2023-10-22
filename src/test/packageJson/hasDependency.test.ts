import { packageHasDependency } from '../../lib/packageJson';

describe('packageHasDependency', () => {
  it('should return true', () => {
    expect(
      packageHasDependency(
        {
          dependencies: {
            test: '',
          },
        },
        'test'
      )
    );
  });

  it('should return true if one of the dependencies is matched', () => {
    expect(
      packageHasDependency(
        {
          devDependencies: {
            test: '',
          },
        },
        ['test2', 'test']
      )
    );
  });

  it('should return false', () => {
    expect(
      packageHasDependency(
        {
          dependencies: {
            test: '',
          },
        },
        'test2'
      )
    );
  });
});
