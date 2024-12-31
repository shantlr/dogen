import { Command } from 'commander';
import { generateDockerfile } from '../lib';
import { isFileExists } from '../lib/utils';
import { parseDogenConfigFile } from '../lib/dogen-config';
import { DogenConfig } from '../lib/types';

const cli = async (argv = process.argv) => {
  const prog = new Command();

  prog
    .command('gen [config-path]', {
      isDefault: true,
    })
    .description(`generate Dockerfile (default command)`)
    .option(
      '-w, --wizard',
      'Start with wizard, this is activated by default when no configuration is provided or detected'
    )
    .action(async (configPath?: string) => {
      try {
        if (configPath && !(await isFileExists(configPath))) {
          console.error(`config does not exists at '${configPath}'`);
          process.exit(1);
        }

        let config: DogenConfig = undefined;
        //#region Parse provided config
        if (configPath) {
          const parsed = await parseDogenConfigFile(configPath);
          config = parsed.config;
          if (parsed.warnings.length) {
            console.warn(parsed.warnings.map((c) => `WARN: ${c}`).join('\n'));
          }
        }
        //#endregion

        const { operation, dockerfilePath } = await generateDockerfile({
          dockerfileConflict: 'append',
          config,
        });
        console.log(`Dockerfile ${operation} at ${dockerfilePath}`);
      } catch (err) {
        switch (err?.message) {
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
