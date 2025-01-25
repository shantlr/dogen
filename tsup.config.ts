import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      cli: 'src/cli/entry.ts',
    },
    outDir: 'build',
    format: 'esm',
    clean: true,
    dts: true,
    noExternal: ['lodash'],
  },
]);
