import { formatDockerfile } from '../../lib/dockerfile';

describe('dockerfile', () => {
  it('should format dockerfile targets with no ops', () => {
    expect(
      formatDockerfile([
        {
          from: 'node:18',
          as: 'app',
          ops: [],
        },
      ])
    ).toBe(`FROM node:18 AS app`);
  });

  it('should format basic node install dockerfile target', () => {
    expect(
      formatDockerfile([
        {
          from: 'node:18',
          as: 'app',
          ops: [
            {
              type: 'WORKDIR',
              value: '/app',
            },
            {
              type: 'COPY',
              src: 'package.json',
            },
            {
              type: 'COPY',
              src: 'yarn.lock',
            },
            {
              type: 'RUN',
              cmd: `yarn install`,
            },
          ],
        },
      ])
    ).toBe(`FROM node:18 AS app
WORKDIR /app
COPY package.json
COPY yarn.lock
RUN yarn install`);
  });

  it('should format env', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'ENV',
              name: 'SERVICE_PORT',
              value: '3000',
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS app
ENV SERVICE_PORT=3000`);
  });
  it('should format label', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'LABEL',
              name: 'name',
              value: 'service',
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS app
LABEL name=service`);
  });
  it('should format copy', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'COPY',
              src: 'package.json',
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS app
COPY package.json`);
  });
  it('should format copy from', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'common',
          ops: [],
        },
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'COPY',
              from: 'common',
              src: '/app/package.json',
              dst: 'package.json',
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS common

FROM alpine:3.18 AS app
COPY --from=common /app/package.json package.json`);
  });
  it('should format expose', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'EXPOSE',
              port: 3000,
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS app
EXPOSE 3000`);
  });
  it('should format cmd', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'CMD',
              cmd: 'yarn install',
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS app
CMD yarn install`);
  });
  it('should format array cmd', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'CMD',
              cmd: ['yarn', 'install'],
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS app
CMD ["yarn","install"]`);
  });
  it('should format run', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'RUN',
              cmd: 'yarn install',
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS app
RUN yarn install`);
  });
  it('should format array run', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'RUN',
              cmd: ['yarn', 'install'],
            },
          ],
        },
      ])
    ).toBe(`FROM alpine:3.18 AS app
RUN ["yarn","install"]`);
  });
});
