# Stageby

Stageby — приложение для планирования и контроля поэтапного строительства.
Репозиторий: API, веб-интерфейс и общий OpenAPI-контракт.

## Стек

- API: Fastify, TypeScript, Zod, Drizzle ORM и PostgreSQL.
- Web: React, Vite, TanStack Router, TanStack Query и Tailwind CSS.
- Файлы: приватное S3-совместимое хранилище; локально — MinIO.
- Контракт: OpenAPI 3.1 с генерацией серверных типов и клиентского кода.

## Быстрый старт

Для локальной разработки нужны:

- Node.js 24.7+;
- pnpm 11+;
- работающий Docker Engine с Compose.

Все команды ниже выполняются из корня репозитория.

```sh
pnpm run bootstrap
pnpm --dir api run admin:create-first-manager
pnpm run dev
```

`bootstrap`:

1. Создаёт отсутствующие `.env`; существующие сохраняет.
2. Устанавливает зависимости всех пакетов и Git-хуки.
3. Генерирует контракт, код API, клиент и дерево маршрутов.
4. Запускает PostgreSQL и MinIO.
5. Применяет миграции.

Для создания первого руководителя команда запросит логин, ФИО и пароль для входа.
При непустой таблице пользователей записи не меняются.

| Сервис | Локальный адрес |
| --- | --- |
| Web | [http://localhost:3000](http://localhost:3000) |
| API | [http://127.0.0.1:3001](http://127.0.0.1:3001) |
| Swagger UI | [http://127.0.0.1:3001/documentation](http://127.0.0.1:3001/documentation) |

Настройки: `api/.env` и `web/.env`. Vite перенаправляет запросы в API по `API_PROXY_TARGET`.

## Основные команды

| Команда | Назначение |
| --- | --- |
| `pnpm run bootstrap` | Подготовить локальное окружение |
| `pnpm run dev` | Запустить API и Web |
| `pnpm run check` | Проверить контракт, линтеры, типы, тесты и сборки обоих приложений |
| `pnpm run codegen` | Обновить OpenAPI bundle, код API, клиент и дерево маршрутов |
| `pnpm run db:up` | Запустить PostgreSQL и MinIO и дождаться готовности |
| `pnpm run db:down` | Остановить локальные контейнеры |
| `pnpm run db:logs` | Показать логи PostgreSQL и MinIO |

`check` может исправлять файлы. Требования тестов — в [API README](api/README.md#тесты).

Команды отдельных пакетов: [API](api/README.md), [Web](web/README.md),
[контракты](contracts/README.md).

## Структура

| Каталог | Содержание |
| --- | --- |
| `api/` | Fastify API, схема БД, миграции и серверные тесты |
| `web/` | React-приложение и тесты интерфейса |
| `contracts/` | Исходники OpenAPI и собранный контракт |
| `infrastructure/` | Сборка локальной инфраструктуры |
| `scripts/` | Подготовка окружения |
| `docs/` | Правила, руководства, решения, отчёты и текущие планы |

Локальные PostgreSQL и MinIO описаны в `compose.yaml`.

## Изменение контракта

Изменяйте исходники в `contracts/references/`, затем выполняйте из корня `pnpm run codegen`.
Порядок работы описан в [README контрактов](contracts/README.md).

`contracts/openapi.yaml`, `api/src/generated/` и `web/src/generated/` создаются автоматически: их
сохраняют в Git вместе с исходниками и не редактируют вручную.

## Документация

- [Карта документации](docs/README.md).
- [Настройка API, файлового хранилища и авторизации](docs/guides/api-configuration.md).
- [Доступ с телефона и демонстрация через Quick Tunnel](docs/guides/local-demo.md).
- [Ручной регресс](docs/guides/regression/README.md).
- [План production-развёртывания](docs/plans/production-deployment.md).
