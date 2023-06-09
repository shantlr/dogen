import { Command } from 'commander';
import { generateDockerfile } from '../lib';

const main = async () => {
  const prog = new Command();

  prog
    .command('gen', {
      isDefault: true,
    })
    .description(`generate Dockerfile (default command)`)
    .option(
      '-w, --wizard',
      'Start with wizard, this is activated by default when no configuration is detected'
    )
    .action(async () => {
      try {
        const { state, dockerfilePath } = await generateDockerfile({
          conflict: 'append',
        });
        console.log(`Dockerfile ${state} at ${dockerfilePath}`);
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
