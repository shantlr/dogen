import { readFile } from 'fs/promises';

import { DirectoryJSON, vol } from 'memfs';

import cli from '.';

vi.mock('fs/promises');

const setupVol = (json: DirectoryJSON, cwd: string) => {
  vol.fromJSON(json, cwd);
  const spy = vi.spyOn(process, 'cwd');
  spy.mockReturnValue(cwd);
};

describe('cli', () => {
  beforeEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it('should create dockerfile', async () => {
    setupVol(
      {
        '/app/package.json': JSON.stringify({
          name: 'app',
          version: '1.0.0',
        }),
        '/app/yarn.lock': '',
      },
      '/app',
    );

    await cli(['ts-node', 'dogen']);
    expect((await readFile('./Dockerfile')).toString()).toMatchSnapshot();
  });

  it('should exit if no preset matched', async () => {
    setupVol({}, '/app');

    const spy = vi.spyOn(process, 'exit');
    try {
      await cli(['ts-node', 'dogen']);
    } catch {
      //
    }
    expect(spy).toHaveBeenCalledWith(1);
  });

  describe('presets', () => {
    describe('node-service', () => {
      it('should generate dockerfile', async () => {
        const packageJson = {
          name: 'express-server',
          version: '1.0.0',
          main: 'build/index.js',
        };
        setupVol(
          {
            '/service/package.json': JSON.stringify(packageJson),
            '/service/yarn.lock': '',
          },
          '/service',
        );

        await cli(['ts-node', 'dogen']);

        const dockerfile = (await readFile('./Dockerfile')).toString();

        expect(dockerfile).toMatchInlineSnapshot(`
          "#>>dogen
          FROM alpine:3.12 AS jq
          RUN apk add --update --no-cache jq

          FROM node:22-alpine AS base_node

          # Extract minimal fields for dependencies installation
          # This step avoid reinstalling node_modules due to field that is unrelated
          FROM jq AS extract_deps
          COPY ../../service/package.json /tmp/package.json
          RUN jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json

          # Install node_modules
          FROM base_node AS install_modules
          WORKDIR /app
          COPY --from=extract_deps /tmp/deps.json package.json
          COPY /service/yarn.lock yarn.lock
          RUN ["/bin/sh","-c","yarn","install","--pure-lockfile","--non-interactive","--cache-folder","./.ycache","&&","rm","-rf","./.ycache"]

          # Build
          FROM install_modules AS build
          WORKDIR /app
          COPY /service/package.json package.json
          RUN ["yarn","run","build"]

          FROM build AS service
          CMD ["yarn","run","start"]
          #<<dogen
          "
        `);
      });
    });
  });
});
