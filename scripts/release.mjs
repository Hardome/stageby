import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { buildRelease } from '../infrastructure/production/release/build.mts';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { output: { type: 'string' } },
  });

  if (positionals.length !== 1 || positionals[0] !== 'build') {
    throw new Error('Usage: pnpm run release build [--output directory]');
  }

  await buildRelease(root, values.output ? resolve(root, values.output) : undefined);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
