# Repository Guidelines

## Project Structure & Module Organization

Stageby has three pnpm packages. `api/` contains the Fastify server, Drizzle schema and migrations, and tests. `web/` contains the React and Vite app; UI code follows the `app`, `pages`, `widgets`, `features`, and `shared` layers under `web/src/`. `contracts/references/` holds source OpenAPI definitions; `contracts/openapi.yaml` is the generated bundle. Design notes live in `docs/`.

## Task-Specific Documentation

Read documentation only when the task touches the area listed below, and read only the relevant sections. Do not preload all of `docs/` or follow every cross-reference; open another document only when it is needed for the current task. For tasks spanning several areas, use the applicable documents together.

| Read when working on | Documentation |
| --- | --- |
| Web features, frontend layer boundaries, routing, forms, state, or client integration in `web/` | [Web guidelines](docs/web-guidelines.md) |
| UI appearance, design-system components, tokens, colors, typography, spacing, or interaction states | [Design system](docs/design-system.md) |
| Fastify modules, routes, repositories, or API module integration tests in `api/` | [API module guidelines](docs/api-modules-guidelines.md) |
| PostgreSQL or Drizzle schemas, database queries, constraints, or migrations | [Database guidelines](docs/database-guidelines.md) |
| HTTP endpoints, request/response schemas, API errors, access rules, or OpenAPI contracts | [API contract](docs/api-contract.md) |
| Business entities, relationships, roles, construction stages, checklists, or domain rules | [Domain model](docs/domain-model.md) |
| Investigating the implementation history or decisions for authentication, sessions, users, or their migrations | [Completed auth/users implementation plan](docs/auth-users-implementation-plan.md) |

For example, a backend-only change does not require the web guidelines or design system; a styling-only change does not require API or database documentation. The auth/users plan is historical context, not a pending task list; consult current code for implementation status.

## Build, Test, and Development Commands

Use Node.js 24.7+ and pnpm 11+. Run commands from the root.

- `pnpm run bootstrap` prepares env files and dependencies, generates code, starts PostgreSQL, and applies migrations.
- `pnpm run dev` starts the API and web app together.
- `pnpm run check` builds the contract and runs lint, type checks, tests, and builds for both apps. Lint tasks may modify files.
- `pnpm run codegen` rebuilds the OpenAPI bundle and generated API, client, and route code after contract or route changes.
- `pnpm --dir api run test` or `pnpm --dir web run test` runs one package's Vitest suite.

## Coding Style & Naming Conventions

Write TypeScript with two space indentation, LF endings, single quotes, and semicolons. Biome formats and checks both apps; web also uses ESLint, Stylelint, Steiger, and cspell. Prefer descriptive kebab case filenames such as `user-form.test.ts`; follow existing feature and module boundaries. Do not edit `api/src/generated/`, `web/src/generated/`, or bundled `contracts/openapi.yaml` by hand. Change their sources and run code generation.

## Testing Guidelines

Use Vitest. Name tests `*.test.ts` or `*.test.tsx` beside implementation; API integration tests may live in `api/test/`. Cover changed behavior and error paths. API integration tests need PostgreSQL running (`pnpm run db:up`) with migrations applied (`pnpm --dir api run db:migrate`). Web tests use jsdom and Testing Library. No repository wide coverage threshold is configured; run `pnpm --dir web run test:coverage` when coverage detail is useful.

## Commit & Pull Request Guidelines

Recent commits use short subjects, often in Russian, sometimes with an issue or PR number; no strict format is evident. Keep commits focused. For pull requests, explain changed behavior, link the relevant issue, list checks run, and include screenshots for UI changes. Commit regenerated files with their sources. Lefthook runs lint checks before commit and contract, type, and test checks before push.

## Configuration & Secrets

Use `api/.env.example` and `web/.env.example` to create local `.env` files. Keep credentials and local `.env` files out of commits.
