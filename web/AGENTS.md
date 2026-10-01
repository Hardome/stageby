# Web Guidelines

## Structure and Documentation

`web/` contains the React and Vite app. UI code follows the `app`, `pages`, `widgets`, `features`, and `shared` layers under `src/`.

Read only the documentation relevant to the task:

| Read when working on | Documentation |
| --- | --- |
| Web features, frontend layer boundaries, routing, forms, state, or client integration | [Web guidelines](../docs/web-guidelines.md) |
| UI appearance, design-system components, tokens, colors, typography, spacing, or interaction states | [Design system](../docs/design-system.md) |

## Commands and Code

Run commands from the repository root. `pnpm --dir web run test` runs the web Vitest suite. Run `pnpm --dir web run test:coverage` when coverage detail is useful.

Web uses ESLint, Stylelint, Steiger, and cspell in addition to Biome. Follow the existing frontend layer boundaries. Do not edit `src/generated/` by hand; change its sources and run `pnpm run codegen` from the repository root.

## Testing and Configuration

Web tests use jsdom and Testing Library. Use `web/.env.example` to create a local `web/.env` file; keep it out of commits.
