# Stageby API

Серверная часть приложения для поэтапного строительства: Fastify и TypeScript, контракт OpenAPI, проверка данных через Zod и PostgreSQL через Drizzle ORM.

## Первый запуск

Нужны Node.js 24+, pnpm 11+ и запущенный PostgreSQL. Команды выполняются из папки `api`:

```sh
cd api
pnpm install
pnpm run db:migrate
pnpm run dev
```

По умолчанию API слушает `http://127.0.0.1:3001`, Swagger UI доступен на [http://127.0.0.1:3001/documentation](http://127.0.0.1:3001/documentation).

## Основные команды

| Команда | Назначение |
| --- | --- |
| `pnpm run dev` | Разработка с перезапуском при изменении файлов |
| `pnpm run test` / `pnpm run test:watch` | Интеграционные тесты с PostgreSQL один раз / в режиме наблюдения |
| `pnpm run lint` | Biome, проверка орфографии и типов; Biome автоматически исправляет файлы |
| `pnpm run typecheck` | Только проверка типов |
| `pnpm run build` / `pnpm run start` | Собрать проект / запустить собранный сервер |

## База данных

Схемы таблиц лежат в `src/db/schema`, SQL-миграции — в `src/db/migrations`.

```sh
pnpm run db:generate
pnpm run db:migrate
```

`db:generate` сравнивает схему с предыдущей миграцией и создаёт новый SQL-файл, но не меняет базу. 
`db:migrate` применяет только ещё не выполненные миграции и записывает их в журнал Drizzle. После изменения схемы запускайте команды в этом порядке. Для просмотра базы: `pnpm run db:studio`.

Подробный порядок изменения схемы и возврата изменений — в [руководстве по БД и миграциям](../docs/database-guidelines.md).

## Контракт API

Источник истины — `../contracts/openapi.yaml`. После его изменения запустите `pnpm run codegen`: команда заново создаст `src/generated` и проверит типы. Сгенерированные файлы вручную не редактируются.

## Новые сущности

Правила структуры, импортов, репозиториев и тестов — в [руководстве по API-модулям](../docs/api-modules-guidelines.md). За образец берите модуль `todos`.
