# API Guidelines

## Structure and Documentation

`api/` contains the Fastify server, Drizzle schema and migrations, and tests.

Read only the documentation relevant to the task:

| Read when working on | Documentation |
| --- | --- |
| Fastify modules, routes, repositories, or API module integration tests | [API module guidelines](../docs/api-modules-guidelines.md) |
| PostgreSQL or Drizzle schemas, database queries, constraints, or migrations | [Database guidelines](../docs/database-guidelines.md) |
| Investigating the implementation history or decisions for authentication, sessions, users, or their migrations | [Completed auth/users implementation plan](../docs/auth-users-implementation-plan.md) |

The auth/users plan is historical context, not a pending task list; consult current code for implementation status.

## Commands and Code

Run commands from the repository root. `pnpm --dir api run test` runs the API Vitest suite. Do not edit `src/generated/` by hand; change its sources and run `pnpm run codegen` from the repository root.

## Testing and Configuration

API integration tests may live in `test/`. They need PostgreSQL running (`pnpm run db:up`) with migrations applied (`pnpm --dir api run db:migrate`). Use `api/.env.example` to create a local `api/.env` file; keep it out of commits.
