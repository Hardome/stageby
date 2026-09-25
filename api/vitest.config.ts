import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

export default defineConfig({
  resolve: {
    alias: {
      '#app': fileURLToPath(new URL('./src', import.meta.url)),
      '#test': fileURLToPath(new URL('./test', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-environment.ts'],
    fileParallelism: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
