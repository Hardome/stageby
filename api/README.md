# Stageby API

<!-- cspell:ignore Referer -->

Сервер на Fastify и TypeScript с Zod-валидацией из OpenAPI и PostgreSQL через Drizzle ORM.
Подготовка всего проекта описана в [корневом README](../README.md#быстрый-старт).

## Отдельный запуск

После общей подготовки убедитесь, что PostgreSQL и MinIO работают (`pnpm run db:up` из корня).
Команды API выполняются из каталога `api`:

```sh
pnpm run dev
```

API: [http://127.0.0.1:3001](http://127.0.0.1:3001), Swagger UI:
[http://127.0.0.1:3001/documentation](http://127.0.0.1:3001/documentation).

Настройки: окружение и `api/.env`. Пример — [.env.example](.env.example),
описание БД, S3 и доступа браузера — в [конфигурации API](../docs/guides/api-configuration.md).

## Команды

Из корня репозитория используйте `pnpm --dir api run <команда>`.

| Команда | Назначение |
| --- | --- |
| `pnpm run dev` | Запустить API с перезапуском при изменениях |
| `pnpm run check` | Выполнить линтеры, проверку типов, тесты и сборку |
| `pnpm run build` | Обновить generated-код и собрать `dist/` |
| `pnpm run start` | Запустить готовую сборку |
| `pnpm run codegen` | Сгенерировать типы и схемы из готового OpenAPI bundle, проверить типы |
| `pnpm run typecheck` | Проверить типы |
| `pnpm run lint` | Выполнить Biome с исправлениями, cspell и проверку типов |
| `pnpm run lint:knip` | Отдельно проверить неиспользуемые файлы, экспорты и зависимости |
| `pnpm run test` | Запустить Vitest однократно |
| `pnpm run test:watch` | Запустить Vitest в режиме наблюдения |
| `pnpm run db:generate` | Создать SQL-миграцию по изменению схемы |
| `pnpm run db:migrate` | Применить ещё не выполненные миграции |
| `pnpm run db:studio` | Открыть Drizzle Studio |
| `pnpm run admin:create-first-manager` | Создать первого руководителя в пустой таблице пользователей |

`lint` и `check` могут менять файлы. `start` не собирает приложение и не устанавливает `NODE_ENV`;
режим задаётся окружением или `.env`.

## Первый руководитель

После применения миграций выполните: `pnpm run admin:create-first-manager`.

- Запрашивает логин, ФИО и скрытый пароль.
- Создаёт пользователя только при пустой `users`; HTTP-маршрута нет.
- Для автоматизации — [переменные первого руководителя](../docs/guides/api-configuration.md#первый-руководитель-без-интерактивного-ввода).

## Тесты

- PostgreSQL: `DATABASE_URL`, права создания и удаления БД.
- MinIO: параметры `S3_*`; нужен для сквозного теста загрузок.
- Vitest сам создаёт, мигрирует и удаляет временную БД; основную мигрировать для тестов не нужно.

## Контракт, БД и авторизация

- После изменения контракта выполните `pnpm run codegen` из корня репозитория.
  Generated-код вручную не редактируется.
- Схема: `src/db/schema/`; миграции: `src/db/migrations/`. Перед применением прочитайте SQL.
- Браузер: HttpOnly cookie, `credentials: include`.
- Изменяющие запросы, включая вход, требуют доверенный `Origin` либо `Referer`.
  Это относится и к командной строке; [настройка авторизации](../docs/guides/api-configuration.md#авторизация-и-источник-запроса).

## Правила разработки

- [Структура API-модулей и репозиториев](../docs/rules/api-modules-guidelines.md).
- [Контракт, доступы и ошибки](../docs/rules/api-contract.md).
- [Предметная модель](../docs/rules/domain-model.md).
- [Хранение аудита](../docs/rules/audit-storage.md).
