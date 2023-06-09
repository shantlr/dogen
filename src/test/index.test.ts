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

    expect(dockerfile).toBe(`#dogen
FROM alpine:3.12 AS jq
RUN apk add --update --no-cache jq

# Base image that will be used for installing / running service
FROM node:latest AS node-base

# Strip package.json and only keep fields used for installing node_modules
FROM jq AS extract-deps
COPY package.json /tmp/package.json
RUN jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json

# Install express-server node_modules
FROM node-base AS install-deps
WORKDIR /app
COPY --from=extract-deps /tmp/deps.json package.json
COPY yarn.lock yarn.lock
RUN yarn install --pure-lockfile --non-interactive --cache-folder ./.ycache && rm -rf ./.ycache

# Build express-server
FROM node-base AS build
WORKDIR /app
COPY --from=install-deps /app/node_modules node_modules
COPY package.json package.json
CMD yarn build

FROM build AS service
CMD node build/index.js
#enddogen
`);
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

    expect(dockerfile).toBe(`#dogen
FROM alpine:3.12 AS jq
RUN apk add --update --no-cache jq

# Base image that will be used for installing / running service
FROM node:latest AS node-base

# Strip package.json and only keep fields used for installing node_modules
FROM jq AS extract-deps
COPY package.json /tmp/package.json
RUN jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json

# Install express-server node_modules
FROM node-base AS install-deps
WORKDIR /app
COPY --from=extract-deps /tmp/deps.json package.json
COPY yarn.lock yarn.lock
RUN yarn install --pure-lockfile --non-interactive

# Build express-server
FROM node-base AS build
WORKDIR /app
COPY --from=install-deps /app/node_modules node_modules
COPY package.json package.json
CMD yarn build

FROM build AS service
CMD node build/index.js
#enddogen
`);
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

    expect(dockerfile).toBe(`#dogen
FROM alpine:3.12 AS jq
RUN apk add --update --no-cache jq

# Base image that will be used for installing / running service
FROM node:latest AS node-base

# Strip package.json and only keep fields used for installing node_modules
FROM jq AS extract-deps
COPY package.json /tmp/package.json
RUN jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json

# Install express-server node_modules
FROM node-base AS install-deps
WORKDIR /app
COPY --from=extract-deps /tmp/deps.json package.json
COPY yarn.lock yarn.lock
RUN --mount=type=secret,id=npmrc,dst=/app/.npmrc,ro=true yarn install --pure-lockfile --non-interactive --cache-folder ./.ycache && rm -rf ./.ycache

# Build express-server
FROM node-base AS build
WORKDIR /app
COPY --from=install-deps /app/node_modules node_modules
COPY package.json package.json
CMD yarn build

FROM build AS service
CMD node build/index.js
#enddogen
`);
  });
});
