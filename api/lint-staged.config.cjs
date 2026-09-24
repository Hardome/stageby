module.exports = {
  '{src,test}/**/*.{js,jsx,ts,tsx}': 'pnpm exec biome check --write --no-errors-on-unmatched',
  '*.config.ts': 'pnpm exec biome check --write --no-errors-on-unmatched',
};
