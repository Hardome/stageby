import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), svgr()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/generated/**', 'src/**/*.d.ts', 'src/app/main.tsx'],
    },
  },
  resolve: {
    alias: {
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
      '@route-tree': fileURLToPath(new URL('./src/generated/routes/route-tree.gen.ts', import.meta.url)),
      '@api/clients': fileURLToPath(new URL('./src/generated/api/clients', import.meta.url)),
      '@api/queries': fileURLToPath(new URL('./src/generated/api/hooks/queries', import.meta.url)),
      '@api/mutations': fileURLToPath(new URL('./src/generated/api/hooks/mutations', import.meta.url)),
      '@api/types': fileURLToPath(new URL('./src/generated/api/types', import.meta.url)),
      '@api/zod': fileURLToPath(new URL('./src/generated/api/zod', import.meta.url)),
    },
  },
});
