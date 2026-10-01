# Repository Guidelines

## Project Structure & Module Organization

Stageby has three pnpm packages: `api/`, `web/`, and `contracts/`. Package-specific instructions live in `api/AGENTS.md` and `web/AGENTS.md`. `contracts/references/` holds source OpenAPI definitions; `contracts/openapi.yaml` is the generated bundle. Design notes live in `docs/`.

## Task-Specific Documentation

Read documentation only when the task touches the area listed below, and read only the relevant sections. Do not preload all of `docs/` or follow every cross-reference; open another document only when it is needed for the current task. For tasks spanning several areas, use the applicable documents together.

| Read when working on | Documentation |
| --- | --- |
| HTTP endpoints, request/response schemas, API errors, access rules, or OpenAPI contracts | [API contract](docs/api-contract.md) |
| Business entities, relationships, roles, construction stages, checklists, or domain rules | [Domain model](docs/domain-model.md) |

For tasks spanning several areas, use the applicable documents together.

## Build, Test, and Development Commands

Use Node.js 24.7+ and pnpm 11+. Run commands from the root.

- `pnpm run bootstrap` prepares env files and dependencies, generates code, starts PostgreSQL, and applies migrations.
- `pnpm run dev` starts the API and web app together.
- `pnpm run check` builds the contract and runs lint, type checks, tests, and builds for both apps. Lint tasks may modify files.
- `pnpm run codegen` rebuilds the OpenAPI bundle and generated API, client, and route code after contract or route changes.

## Coding Style & Naming Conventions

Write TypeScript with two space indentation, LF endings, single quotes, and semicolons. Biome formats and checks both apps. Prefer descriptive kebab case filenames such as `user-form.test.ts`; follow existing feature and module boundaries. Do not edit bundled `contracts/openapi.yaml` by hand. Change its sources and run code generation.

## Testing Guidelines

Use Vitest. Name tests `*.test.ts` or `*.test.tsx` beside implementation. Cover changed behavior and error paths. No repository wide coverage threshold is configured.

## Commit & Pull Request Guidelines

Recent commits use short subjects, often in Russian, sometimes with an issue or PR number; no strict format is evident. Keep commits focused. For pull requests, explain changed behavior, link the relevant issue, list checks run, and include screenshots for UI changes. Commit regenerated files with their sources. Lefthook runs lint checks before commit and contract, type, and test checks before push.

## Configuration & Secrets

Keep credentials and local `.env` files out of commits. Package-specific environment examples are listed in each package's `AGENTS.md`.
