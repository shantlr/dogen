import { vol } from 'memfs';

import { findPackageJson } from '../../lib/package-json';

vi.mock('fs/promises');

describe('findPackageJson', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should find current dir package.json', async () => {
    const packageJson = {
      name: 'app',
      version: '1.0.0',
    };
    vol.fromJSON(
      {
        '/app/package.json': JSON.stringify(packageJson),
      },
      '/app',
    );

    expect(await findPackageJson('/app', '/')).toEqual({
      dir: '/app',
      packageJson,
      packageJsonPath: '/app/package.json',
    });
  });

  it('should find parent dir package.json', async () => {
    const packageJson = {
      name: 'app',
      version: '1.0.0',
    };
    vol.fromJSON({
      '/app/package.json': JSON.stringify(packageJson),
    });

    expect(await findPackageJson('/app/src/config', '/')).toEqual({
      dir: '/app',
      packageJson,
      packageJsonPath: '/app/package.json',
    });
  });

  it('should stop at provided root', async () => {
    const packageJson = {
      name: 'app',
      version: '1.0.0',
    };
    vol.fromJSON({
      '/app/package.json': JSON.stringify(packageJson),
    });

    expect(await findPackageJson('/app/src/config', '/app/src')).toBe(null);
  });
});
