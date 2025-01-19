import { vol } from 'memfs';

import { applyConfigExtensions, getDogenConfig } from '.';

vi.mock('fs/promises');

describe('applyConfigExtensions', () => {
  it('should apply appends', () => {
    expect(
      applyConfigExtensions({}, [
        {
          append: {
            build: {
              src_detect_additional_files: ['file1.ts', 'file2.ts'],
            },
          },
        },
        {
          append: {
            build: {
              src_detect_additional_files: ['file3.ts'],
            },
          },
        },
      ]),
    ).toEqual({
      build: {
        src_detect_additional_files: ['file1.ts', 'file2.ts', 'file3.ts'],
      },
    });
  });
});

describe('dogen config', () => {
  beforeEach(() => {
    vol.reset();
  });

  it.only('should load .dogenrc', async () => {
    const config = {
      container: {
        workdir: '/app',
      },
    };
    await vol.fromJSON({
      '/app/.dogenrc': JSON.stringify(config),
    });
    const { config: detectedConf } = await getDogenConfig('/app');
    expect(detectedConf).toEqual(config);
  });
  it.only('should warn when config has both run.cmd and run.script', async () => {
    const config = {
      container: {
        workdir: '/app',
      },
      run: {
        cmd: 'yarn start',
        script: 'start',
      },
    };
    await vol.fromJSON({
      '/app/.dogenrc': JSON.stringify(config),
    });
    const { config: detectedConf, warnings } = await getDogenConfig('/app');
    expect(detectedConf).toEqual(config);
    expect(warnings).toEqual([]);
  });
});
