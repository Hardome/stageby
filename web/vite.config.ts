import { fileURLToPath, URL } from 'node:url';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
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
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: loadEnv(mode, process.cwd(), 'API_PROXY_TARGET').API_PROXY_TARGET ?? 'http://127.0.0.1:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api(?=\/|$)/, '') || '/',
      },
    },
  },
}));
