import { vol } from 'memfs';
import { detectBuildFiles } from '../../lib/detectBuildFiles';

jest.mock('fs/promises');

describe('detectBuildFiles', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should detect src files', async () => {
    vol.fromNestedJSON({
      '/app': {
        src: {},
      },
    });

    const res = await detectBuildFiles({
      config: {},
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
      },
    });
    expect(res).toEqual(['/app/src']);
  });

  it('should detect tsconfig file', async () => {
    vol.fromNestedJSON({
      '/app': {
        src: {},
        'tsconfig.json': '',
      },
    });

    const res = await detectBuildFiles({
      config: {},
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
        devDependencies: {
          typescript: '^5',
        },
      },
    });
    expect(res).toEqual(['/app/src', '/app/tsconfig.json']);
  });

  it('should detect .eslintrc', async () => {
    vol.fromNestedJSON({
      '/app': {
        src: {},
        '.eslintrc': '',
      },
    });

    const res = await detectBuildFiles({
      config: {},
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
        devDependencies: {
          eslint: '^8',
        },
      },
    });
    expect(res).toEqual(['/app/src', '/app/.eslintrc']);
  });

  it('should detect .eslintrc.js', async () => {
    vol.fromNestedJSON({
      '/app': {
        src: {},
        '.eslintrc.js': '',
      },
    });

    const res = await detectBuildFiles({
      config: {},
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
        devDependencies: {
          eslint: '^8',
        },
      },
    });
    expect(res).toEqual(['/app/src', '/app/.eslintrc.js']);
  });

  it('should not detect vite files if no vite dependencies', async () => {
    vol.fromNestedJSON({
      '/app': {
        src: {},
        'tsconfig.json': '',
        'tsconfig.node.json': '',
        'vite.config.ts': '',
      },
    });

    const res = await detectBuildFiles({
      config: {},
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
        devDependencies: {},
      },
    });
    expect(res).toEqual(['/app/src']);
  });
  it('should detect vite files', async () => {
    vol.fromNestedJSON({
      '/app': {
        src: {},
        'tsconfig.json': '',
        'tsconfig.node.json': '',
        'vite.config.ts': '',
      },
    });

    const res = await detectBuildFiles({
      config: {},
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
        devDependencies: {
          vite: '^4',
        },
      },
    });
    expect(res).toEqual([
      '/app/src',
      '/app/vite.config.ts',
      '/app/tsconfig.node.json',
    ]);
  });
});
