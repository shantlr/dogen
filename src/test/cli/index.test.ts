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
    expect((await readFile('./Dockerfile')).toString()).toBe(`#dogen
FROM alpine:3.12 AS jq
RUN apk add --update --no-cache jq

# Base image that will be used for installing / running service
FROM node:latest AS node-base

# Strip package.json and only keep fields used for installing node_modules
FROM jq AS app_extract-deps
COPY package.json /tmp/package.json
RUN jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json

# Install app node_modules
FROM node-base AS app_install-deps
WORKDIR /service
COPY --from=app_extract-deps /tmp/deps.json package.json
COPY yarn.lock yarn.lock
RUN yarn install --frozen-lockfile --no-cache

# Build app
FROM node-base AS app_build
WORKDIR /service
COPY --from=app_install-deps /service/node_modules node_modules
COPY package.json package.json
CMD yarn build

FROM app_build AS app
CMD node ./build/index.js
#enddogen
`);
  });
});
