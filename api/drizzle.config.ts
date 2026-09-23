import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Для запуска Drizzle Kit требуется DATABASE_URL');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
