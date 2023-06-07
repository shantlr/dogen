import { vol } from 'memfs';
import { generateDockerfile } from '../lib';
import { readFile } from 'fs/promises';

jest.mock('fs/promises');

describe('test', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should', async () => {
    const packageJson = {
      name: 'express-server',
      version: '1.0.0',
    };
    vol.fromJSON(
      {
        '/service/package.json': JSON.stringify(packageJson),
        '/service/yarn.lock': '',
      },
      '/tmp'
    );

    await generateDockerfile({
      dir: '/service',
    });
    const dockerfile = (await readFile('/service/Dockerfile')).toString();

    expect(dockerfile).toBe(`FROM alpine:3.12 AS jq
RUN apk add --update --no-cache jq

FROM node:latest AS node-base

FROM jq AS express-server_extract-deps
COPY .. /tmp/package.json
RUN jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json

FROM node-base AS express-server_install-deps
WORKDIR /app
COPY --from=express-server_extract-deps /tmp/deps.json package.json
COPY /service/yarn.lock
RUN yarn install

FROM express-server_install-deps AS express-server_build
WORKDIR /app
COPY --from=express-server_install-deps /app/node_modules node_modules
CMD yarn build

FROM express-server_build AS express-server
CMD node ./build/index.js`);
  });
});
