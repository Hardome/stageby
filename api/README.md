# Stageby API

Fastify API на TypeScript с contract-first OpenAPI, Zod и Drizzle ORM.

## Контракты

Источник истины находится в `../contracts/openapi.yaml`. Файлы в `src/generated` создаются автоматически и не должны редактироваться вручную.

```sh
pnpm run contracts:check
```

## Локальный запуск

Скопируйте `.env.example` в `.env`, укажите доступный PostgreSQL и выполните:

```sh
pnpm dev
```

Swagger UI будет доступен по адресу `/documentation`.

## База данных

Схема Drizzle находится в `src/db/schema.ts`, миграции — в `src/db/migrations`.

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Rate limit использует память процесса. Для нескольких экземпляров API потребуется общий внешний store. Если приложение работает за reverse proxy, настройте `trustProxy` под конкретную инфраструктуру.
