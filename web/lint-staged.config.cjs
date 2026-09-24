module.exports = {
  '{src,tests}/**/*.{js,jsx,ts,tsx}': [
    'pnpm exec biome check --write --no-errors-on-unmatched',
    'pnpm exec eslint --fix --max-warnings=0 --no-warn-ignored',
  ],
  'src/**/*.css': [
    'pnpm exec biome check --write --no-errors-on-unmatched',
    'pnpm exec stylelint --fix',
  ],
};
