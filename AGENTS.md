# Repository Guidelines

## Project Structure & Module Organization

Stageby has three pnpm packages: `api/`, `web/`, and `contracts/`. Package-specific instructions live in `api/AGENTS.md` and `web/AGENTS.md`. `contracts/references/` holds source OpenAPI definitions; `contracts/openapi.yaml` is the generated bundle. Design notes live in `docs/`.

## Task-Specific Documentation

Read documentation only when the task touches the area listed below, and read only the relevant sections. Do not preload all of `docs/` or follow every cross-reference; open another document only when it is needed for the current task. For tasks spanning several areas, use the applicable documents together.

| Read when working on | Documentation |
| --- | --- |
| HTTP endpoints, request/response schemas, API errors, access rules, or OpenAPI contracts | [API contract](docs/api-contract.md) |
| Business entities, relationships, roles, construction stages, checklists, or domain rules | [Domain model](docs/domain-model.md) |

## Build, Test, and Development Commands

Use Node.js 24.7+ and pnpm 11+. Run commands from the root.

- `pnpm run bootstrap` prepares env files and dependencies, generates code, starts PostgreSQL, and applies migrations.
- `pnpm run dev` starts the API and web app together.
- `pnpm run check` builds the contract and runs lint, type checks, tests, and builds for both apps. Lint tasks may modify files.
- `pnpm run codegen` rebuilds the OpenAPI bundle and generated API, client, and route code after contract or route changes.
- `pnpm --dir api run test` or `pnpm --dir web run test` runs one package's Vitest suite.

## Coding Style & Naming Conventions

Write TypeScript with two space indentation, LF endings, single quotes, and semicolons. Biome formats and checks both apps; web also uses ESLint, Stylelint, Steiger, and cspell. Prefer descriptive kebab case filenames such as `user-form.test.ts`; follow existing feature and module boundaries. Do not edit `api/src/generated/`, `web/src/generated/`, or bundled `contracts/openapi.yaml` by hand. Change their sources and run code generation.

Write comments in Russian. Add them only where they truly help to understand non‑obvious logic, the reason for a decision, or an important limitation. Do not comment on every action and do not retell obvious code. If the meaning can be conveyed by a clear name for a variable, file, or function, improve the name instead of adding a comment.

## Testing Guidelines

Use Vitest. Name tests `*.test.ts` or `*.test.tsx` beside implementation; API integration tests may live in `api/test/`. Cover changed behavior and error paths. API integration tests need PostgreSQL running (`pnpm run db:up`) with migrations applied (`pnpm --dir api run db:migrate`). Web tests use jsdom and Testing Library. No repository wide coverage threshold is configured; run `pnpm --dir web run test:coverage` when coverage detail is useful.

## Commit & Pull Request Guidelines

Never commit directly to `main`. Make changes on a task branch and merge them into `main` only through a pull request after review. Before committing, verify that the current branch is not `main`; if work is already on `main`, create a task branch first and preserve its staged and unstaged changes. Recent commits use short subjects, often in Russian, sometimes with an issue or PR number; no strict format is evident. Keep commits focused. For pull requests, explain changed behavior, link the relevant issue, list checks run, and include screenshots for UI changes. Commit regenerated files with their sources. Lefthook runs lint checks before commit and contract, type, and test checks before push.

## Configuration & Secrets

Use `api/.env.example` and `web/.env.example` to create local `.env` files. Keep credentials and local `.env` files out of commits.
