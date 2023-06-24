import { vol } from 'memfs';
import { detectBuildFiles } from '../../lib/detectBuildFiles';
import exp from 'constants';

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

  it('should only use provided include files', async () => {
    vol.fromNestedJSON({
      '/app': {
        lib: {},
        src: {},
        'tsconfig.json': '',
      },
    });

    const res = await detectBuildFiles({
      config: {
        build: {
          includes: ['lib'],
        },
      },
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
        devDependencies: {
          typescript: '^5',
        },
      },
    });
    expect(res).toEqual(['/app/lib']);
  });
  it('should excludes files', async () => {
    vol.fromNestedJSON({
      '/app': {
        lib: {},
        src: {},
        'tsconfig.json': '',
      },
    });

    const res = await detectBuildFiles({
      config: {
        build: {
          includes: ['lib', 'src'],
          excludes: ['src'],
        },
      },
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
        devDependencies: {
          typescript: '^5',
        },
      },
    });
    expect(res).toEqual(['/app/lib']);
  });
  it('should not excludes file that starts the same but is not exact', async () => {
    vol.fromNestedJSON({
      '/app': {
        file1: '',
        file2: '',
        file: '',
        'tsconfig.json': '',
      },
    });

    const res = await detectBuildFiles({
      config: {
        build: {
          includes: ['file1', 'file2'],
          excludes: ['file'],
        },
      },
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
      },
    });
    expect(res).toEqual(['/app/file1', '/app/file2']);
  });
  it('should excludes autodetected files', async () => {
    vol.fromNestedJSON({
      '/app': {
        src: {},
        'tsconfig.json': '',
      },
    });

    const res = await detectBuildFiles({
      config: {
        build: {
          excludes: ['tsconfig.json'],
        },
      },
      dir: '/app',
      packageJson: {
        name: 'app',
        version: '0.0.1',
        dependencies: {
          typescript: '^5',
        },
      },
    });
    expect(res).toEqual(['/app/src']);
  });
  it('should throw when excludes is more specific than includes', async () => {
    vol.fromNestedJSON({
      '/app': {
        src: {},
        'tsconfig.json': '',
      },
    });

    await expect(() =>
      detectBuildFiles({
        config: {
          build: {
            includes: ['src'],
            excludes: ['src/test.js'],
          },
        },
        dir: '/app',
        packageJson: {
          name: 'app',
          version: '0.0.1',
        },
      })
    ).rejects.toThrow('Excludes more specific than includes is unhandled');
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
