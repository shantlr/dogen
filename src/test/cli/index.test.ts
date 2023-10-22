import { vol } from 'memfs';
import cli from '../../cli';
import { readFile } from 'fs/promises';

jest.mock('fs/promises');

describe('cli', () => {
  beforeEach(() => {
    vol.reset();
    jest.restoreAllMocks();

    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue('/app');
  });

  it('should use custom config path', async () => {
    const config = {
      container: {
        workdir: `/service`,
      },
    };
    vol.fromJSON(
      {
        '/app/package.json': JSON.stringify({
          name: 'app',
          version: '1.0.0',
        }),
        '/app/yarn.lock': '',
        '/app/custom-dogen.json': JSON.stringify(config),
      },
      '/app'
    );

    await cli(['ts-node', 'dogen', 'custom-dogen.json']);
    expect((await readFile('./Dockerfile')).toString()).toMatchSnapshot();
  });
});
