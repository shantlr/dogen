import { vol } from 'memfs';
import { generateDockerfile } from '../lib';
import { readFile } from 'fs/promises';

jest.mock('fs/promises');

describe('generateDockerfile', () => {
  beforeEach(() => {
    vol.reset();
    jest.restoreAllMocks();
  });

  it('should generate Dockerfile for service using yarn', async () => {
    const packageJson = {
      name: 'express-server',
      version: '1.0.0',
      main: 'build/index.js',
    };
    vol.fromJSON(
      {
        '/service/package.json': JSON.stringify(packageJson),
        '/service/yarn.lock': '',
      },
      '/tmp'
    );
    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue('/tmp');

    await generateDockerfile({
      dir: '/service',
    });
    const dockerfile = (await readFile('/service/Dockerfile')).toString();

    expect(dockerfile).toMatchSnapshot();
  });

  it('should follow config install keep cache', async () => {
    const packageJson = {
      name: 'express-server',
      version: '1.0.0',
      main: 'build/index.js',
    };
    const dogenrc = {
      install: {
        keepCache: true,
      },
    };
    vol.fromJSON(
      {
        '/service/package.json': JSON.stringify(packageJson),
        '/service/yarn.lock': '',
        '/service/.dogenrc': JSON.stringify(dogenrc),
      },
      '/tmp'
    );

    await generateDockerfile({
      dir: '/service',
    });
    const dockerfile = (await readFile('/service/Dockerfile')).toString();

    expect(dockerfile).toMatchSnapshot();
  });

  it('should follow config mount npmrc', async () => {
    const packageJson = {
      name: 'express-server',
      version: '1.0.0',
      main: 'build/index.js',
    };
    const dogenrc = {
      install: {
        npmrc: true,
      },
    };
    vol.fromJSON(
      {
        '/service/package.json': JSON.stringify(packageJson),
        '/service/yarn.lock': '',
        '/service/.dogenrc': JSON.stringify(dogenrc),
      },
      '/tmp'
    );

    await generateDockerfile({
      dir: '/service',
    });
    const dockerfile = (await readFile('/service/Dockerfile')).toString();

    expect(dockerfile).toMatchSnapshot();
  });
});
