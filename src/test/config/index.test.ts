import { vol } from 'memfs';
import { detectDogenConfig } from '../../lib/dogen-config';

jest.mock('fs/promises');

describe('dogen config', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should load .dogenrc', async () => {
    const config = {
      root: true,
      containerWorkdir: '/app',
    };
    await vol.fromJSON({
      '/app/.dogenrc': JSON.stringify(config),
    });
    const { config: detectedConf } = await detectDogenConfig('/app');
    expect(detectedConf).toEqual(config);
  });
  it('should warn when config has both build.cmd and build.script', async () => {
    const config = {
      root: true,
      containerWorkdir: '/app',
      build: {
        cmd: 'yarn build',
        script: 'build',
      },
    };
    await vol.fromJSON({
      '/app/.dogenrc': JSON.stringify(config),
    });
    const { config: detectedConf, warnings } = await detectDogenConfig('/app');
    expect(detectedConf).toEqual(config);
    expect(warnings).toEqual([
      `config 'build.script' will be ignored: both 'build.cmd' and 'build.script' has been provided`,
    ]);
  });

  it('should warn when config has both run.cmd and run.script', async () => {
    const config = {
      root: true,
      containerWorkdir: '/app',
      run: {
        cmd: 'yarn start',
        script: 'start',
      },
    };
    await vol.fromJSON({
      '/app/.dogenrc': JSON.stringify(config),
    });
    const { config: detectedConf, warnings } = await detectDogenConfig('/app');
    expect(detectedConf).toEqual(config);
    expect(warnings).toEqual([
      `config 'run.script' will be ignored: both 'run.cmd' and 'run.script' has been provided`,
    ]);
  });
});
