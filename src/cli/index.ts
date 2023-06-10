import { Command } from 'commander';
import { generateDockerfile } from '../lib';
import { isFileExists } from '../lib/utils';
import { parseDogenConfig } from '../lib/dogenConfig';

const main = async () => {
  const prog = new Command();

  prog
    .command('gen [config-path]', {
      isDefault: true,
    })
    .description(`generate Dockerfile (default command)`)
    .option(
      '-w, --wizard',
      'Start with wizard, this is activated by default when no configuration is detected'
    )
    .action(async (configPath?: string) => {
      try {
        if (configPath && !(await isFileExists(configPath))) {
          console.warn(`config does not exists at '${configPath}'`);
          process.exit(1);
        }

        //#region Parse provided config
        const { config, warnings: configWarnings } =
          parseDogenConfig(configPath);
        if (configWarnings.length) {
          console.warn(configWarnings.map((c) => `WARN: ${c}`).join('\n'));
        }
        //#endregion

        const { operation, dockerfilePath } = await generateDockerfile({
          conflict: 'append',
          config,
        });
        console.log(`Dockerfile ${operation} at ${dockerfilePath}`);
      } catch (err) {
        switch (err?.message) {
          case 'DOCKERFILE_ALREADY_EXISTS': {
            console.log(`Dockerfile already exists`);
            return;
          }
          default:
        }
        console.log(`Could not generated Dockerfile`, err);
      }
    });

  await prog.parseAsync(process.argv);
};

void main();
