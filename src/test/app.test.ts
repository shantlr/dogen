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
    const spy = jest.spyOn(process, 'cwd');
    spy.mockReturnValue('/tmp');
    await generateDockerfile({
      dir: '/service',
    });
    const dockerfile = (await readFile('/service/Dockerfile')).toString();

    expect(dockerfile).toBe(`#dogen
FROM alpine:3.12 AS jq
RUN apk add --update --no-cache jq

# Strip package.json and only keep fields used for installing node_modules
FROM jq AS extract-deps
COPY package.json /tmp/package.json
RUN jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json

# Base image that will be used for installing / running service
FROM node:latest AS node-base

# Install vite-app node_modules
FROM node-base AS install-deps
WORKDIR /app
COPY --from=extract-deps /tmp/deps.json package.json
COPY yarn.lock yarn.lock
RUN yarn install --pure-lockfile --non-interactive --cache-folder ./.ycache && rm -rf ./.ycache

# Build vite-app
FROM node-base AS build
WORKDIR /app
COPY --from=install-deps /app/node_modules node_modules
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY vite.config.ts vite.config.ts
COPY tsconfig.node.json tsconfig.node.json
CMD yarn build

# Serve vite-app
FROM nginx:stable-alpine AS serve
COPY --from=build /app/build /app/build
RUN echo -e -n "server {\\n\\
  listen       80;\\n\\
  server_name  localhost;\\n\\
\\n\\
  location / {\\n\\
      root   /usr/share/nginx/html;\\n\\
      index  index.html index.htm;\\n\\
      try_files $uri /index.html;\\n\\
  }\\n\\
\\n\\
  error_page   500 502 503 504  /50x.html;\\n\\
  location = /50x.html {\\n\\
      root   /usr/share/nginx/html;\\n\\
  }\\n\\
" > /etc/nginx/conf.d/default.conf
EXPOSE 80
#enddogen
`);
  });
  it('should generate dockerfile create-react-app', async () => {
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

    expect(dockerfile).toBe(`#dogen
FROM alpine:3.12 AS jq
RUN apk add --update --no-cache jq

# Strip package.json and only keep fields used for installing node_modules
FROM jq AS extract-deps
COPY package.json /tmp/package.json
RUN jq '{name, dependencies, devDependencies}' < /tmp/package.json > /tmp/deps.json

# Base image that will be used for installing / running service
FROM node:latest AS node-base

# Install cra-app node_modules
FROM node-base AS install-deps
WORKDIR /app
COPY --from=extract-deps /tmp/deps.json package.json
COPY yarn.lock yarn.lock
RUN yarn install --pure-lockfile --non-interactive --cache-folder ./.ycache && rm -rf ./.ycache

# Build cra-app
FROM node-base AS build
WORKDIR /app
COPY --from=install-deps /app/node_modules node_modules
COPY package.json package.json
COPY tsconfig.json tsconfig.json
CMD yarn build

# Serve cra-app
FROM nginx:stable-alpine AS serve
COPY --from=build /app/build /app/build
RUN echo -e -n "server {\\n\\
  listen       80;\\n\\
  server_name  localhost;\\n\\
\\n\\
  location / {\\n\\
      root   /usr/share/nginx/html;\\n\\
      index  index.html index.htm;\\n\\
      try_files $uri /index.html;\\n\\
  }\\n\\
\\n\\
  error_page   500 502 503 504  /50x.html;\\n\\
  location = /50x.html {\\n\\
      root   /usr/share/nginx/html;\\n\\
  }\\n\\
" > /etc/nginx/conf.d/default.conf
EXPOSE 80
#enddogen
`);
  });
});
