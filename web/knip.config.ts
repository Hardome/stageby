import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/app/main.tsx'],
  project: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
  ignore: ['src/generated/**', '**/*.d.ts'],
};

export default config;
