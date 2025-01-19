import { formatDockerfile } from '.';

describe('dockerfile', () => {
  it('should format dockerfile targets with no ops', () => {
    expect(
      formatDockerfile([
        {
          from: 'node:18',
          as: 'app',
          ops: [],
        },
      ]),
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
      ]),
    ).toBe(`FROM node:18 AS app
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
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
              values: {
                SERVICE_PORT: '3000',
              },
            },
          ],
        },
      ]),
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
      ]),
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
      ]),
    ).toBe(`FROM alpine:3.18 AS app
COPY package.json package.json`);
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
      ]),
    ).toBe(`FROM alpine:3.18 AS common

FROM alpine:3.18 AS app
COPY --from=common /app/package.json package.json`);
  });
  it('should form copy from target', () => {
    const common = {
      from: 'alpine:3.18',
      as: 'common',
      ops: [],
    };
    expect(
      formatDockerfile([
        common,
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'COPY',
              from: common,
              src: '/app/package.json',
              dst: 'package.json',
            },
          ],
        },
      ]),
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
      ]),
    ).toBe(`FROM alpine:3.18 AS app
EXPOSE 3000`);
  });
  it('should format expose udp', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'EXPOSE',
              port: 80,
              protocol: 'udp',
            },
          ],
        },
      ]),
    ).toBe(`FROM alpine:3.18 AS app
EXPOSE 80/udp`);
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
      ]),
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
      ]),
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
      ]),
    ).toBe(`FROM alpine:3.18 AS app
RUN yarn install`);
  });
  it('should format run with mounts', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'RUN',
              cmd: 'yarn install',
              mounts: [
                {
                  id: 'npmrc',
                  type: 'secret',
                  dst: '.npmrc',
                  readOnly: true,
                },
              ],
            },
          ],
        },
      ]),
    ).toBe(`FROM alpine:3.18 AS app
RUN --mount=type=secret,id=npmrc,dst=.npmrc,ro=true yarn install`);
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
      ]),
    ).toBe(`FROM alpine:3.18 AS app
RUN ["yarn","install"]`);
  });
  it('should write file using echo', () => {
    expect(
      formatDockerfile([
        {
          from: 'alpine:3.18',
          as: 'app',
          ops: [
            {
              type: 'WRITE_FILE',
              content: 'line1\nline2\n\nline3',
              dst: '/app/file',
            },
          ],
        },
      ]),
    ).toMatchInlineSnapshot(`
      "FROM alpine:3.18 AS app
      COPY <<-"EOT" /app/file
      line1
      line2

      line3
      EOT"
    `);
  });
});
