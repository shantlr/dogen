import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { toJsonSchema } from '@valibot/to-json-schema';

import { dogenConfigBaseSchema } from '../lib/dogen-config';

const schema = toJsonSchema(dogenConfigBaseSchema);

const OUTPUT_DIR = path.resolve(__dirname, '../../schemas');

const main = async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    path.resolve(OUTPUT_DIR, 'dogen-config.schema.json'),
    JSON.stringify(schema, null, 2),
  );
};

main();
