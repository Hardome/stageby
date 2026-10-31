import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/release-{source,bundle,build}.test.ts'],
    fileParallelism: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
