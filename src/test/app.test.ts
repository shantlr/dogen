import { vol } from 'memfs';
import { generateDockerfile } from '../lib';
import { readFile } from 'fs/promises';

jest.mock('fs/promises');

describe('generateDockerfile', () => {
  beforeEach(() => {
    vol.reset();
    jest.restoreAllMocks();
  });

  it('should generate dockerfile for vite app', async () => {
    const packageJson = {
      name: 'vite-app',
      version: '1.0.0',
      main: 'build/index.js',
      devDependencies: {
        vite: '*',
        typescript: '*',
      },
    };
    vol.fromJSON(
      {
        '/service/package.json': JSON.stringify(packageJson),
        '/service/yarn.lock': '',
        '/service/vite.config.ts': '',
        '/service/tsconfig.json': '',
        '/service/tsconfig.node.json': '',
      },
      '/tmp'
    );
    jest.spyOn(process, 'cwd').mockReturnValue('/tmp');
    await generateDockerfile({
      dir: '/service',
    });
    const dockerfile = (await readFile('/service/Dockerfile')).toString();

    expect(dockerfile).toMatchSnapshot();
  });
  it.only('should generate dockerfile create-react-app', async () => {
    const packageJson = {
      name: 'cra-app',
      version: '1.0.0',
      main: 'build/index.js',
      devDependencies: {
        'react-scripts': '*',
        typescript: '*',
      },
    };
    vol.fromJSON(
      {
        '/service/package.json': JSON.stringify(packageJson),
        '/service/vite.config.ts': '',
        '/service/tsconfig.json': '',
        '/service/tsconfig.node.json': '',
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
});
