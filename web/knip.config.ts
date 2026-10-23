import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  project: ['src/**/*.{ts,tsx,css}!', '!src/**/*.{test,spec}.{ts,tsx}!', 'tests/**/*.{ts,tsx}'],
  ignore: ['src/generated/**'],
  ignoreIssues: {
    'src/shared/ui/**': ['exports'],
  },
  entry: ['kubb.config.ts', 'steiger.config.ts'],
  ignoreDependencies: ['@cspell/dict-ru_ru'],
};

export default config;
