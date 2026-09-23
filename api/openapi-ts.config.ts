import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../contracts/openapi.yaml',
  output: {
    path: './src/generated',
  },
  plugins: ['@hey-api/typescript', { name: 'zod', compatibilityVersion: 4 }, 'fastify'],
});
