import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['lint-staged.config.cjs'],
  project: ['src/**/*.ts', 'test/**/*.ts'],
  ignore: ['src/generated/**'],
  ignoreDependencies: ['@cspell/dict-ru_ru', 'pino-pretty'],
};

export default config;
