import { readFile } from 'fs/promises';
import path from 'path';

import { Command } from 'commander';
import debug, { Debugger } from 'debug';

import { generateDockerfile } from '../lib';
import { detectPreset } from '../lib/core/presets';

const cli = async (argv = process.argv) => {
  const prog = new Command();

  prog.command('version').action(async () => {
    try {
      const file = await readFile(
        path.resolve(__dirname, '../../../package.json'),
        'utf-8',
      );
      const pkg = JSON.parse(file);
      console.log(pkg.version);
    } catch (err) {
      console.error(err);
      return;
    }
  });

  prog
    .command('gen', {
      isDefault: true,
    })
    .description(`generate Dockerfile (default command)`)
    .option('-v, --verbose', 'Verbose output')
    // .option('-c, --config <path>', 'Path to config file')
    .option(
      '-w, --wizard',
      'Start with wizard, this is activated by default when no configuration is provided or detected',
    )
    .action(async (options: { verbose?: boolean; config?: string }) => {
      try {
        let logger: Debugger | undefined;

        if (options.verbose) {
          debug.enable('dogen:*');
          logger = debug('dogen');
        }

        // if (options?.config && !(await isFileExists(options?.config))) {
        //   console.error(`config does not exists at '${options?.config}'`);
        //   process.exit(1);
        // }
        const res = await detectPreset.run({
          dir: process.cwd(),
          rootDir: process.env.HOME || '/',
          logger,
        });

        if (res.handled) {
          console.log(res.data);
          await generateDockerfile({
            targets: res.data.targets,
            dockerignore: res.data.dockerignore,
            outputDir: res.data.dockerfileOutputDir,
            mode: 'append',
          });
        } else {
          console.error(`Could not detect any preset`);
          process.exit(1);
        }
      } catch (err) {
        switch ((err as Error)?.message) {
          case 'DOCKERFILE_ALREADY_EXISTS': {
            console.error(`ERROR: Dockerfile already exists`);
            return;
          }
          default:
        }
        console.log(`Could not generated Dockerfile\nERROR:`, err);
      }
    });

  await prog.parseAsync(argv);
};

export default cli;
