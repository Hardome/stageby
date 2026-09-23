# Stageby

Stageby — приложение для планирования и контроля поэтапного строительства. Репозиторий объединяет серверное API, веб-интерфейс и общий OpenAPI-контракт.

## Стек

- API: Fastify, TypeScript, Zod, Drizzle ORM и PostgreSQL.
- Web: React, Vite, TanStack Router, TanStack Query и Tailwind CSS.
- Контракт: OpenAPI 3.1 с генерацией серверных типов и клиентского кода.

## Быстрый старт

Для локальной разработки понадобятся:

- Node.js 24 или новее;
- pnpm 11 или новее;
- Docker с запущенным Docker Engine и поддержкой Compose.

Подготовьте проект одной командой из корня репозитория:

```sh
pnpm run bootstrap
```

Команда:

1. создаст `api/.env` и `web/.env` из файлов-примеров, если их ещё нет;
2. установит зависимости API и веб-приложения;
3. сгенерирует код из OpenAPI-контракта и дерево маршрутов;
4. запустит PostgreSQL;
5. применит миграции базы данных.

Существующие `.env` не перезаписываются.

После подготовки запустите оба приложения:

```sh
pnpm run dev
```

Доступные адреса:

| Сервис | Адрес |
| --- | --- |
| Веб-приложение | [http://localhost:3000](http://localhost:3000) |
| API | [http://127.0.0.1:3001](http://127.0.0.1:3001) |
| Swagger UI | [http://127.0.0.1:3001/documentation](http://127.0.0.1:3001/documentation) |

В режиме разработки Vite перенаправляет запросы `/todos` в API. Адрес сервера для прокси задаётся переменной `API_PROXY_TARGET` в `web/.env`.

## Команды из корня

| Команда | Назначение |
| --- | --- |
| `pnpm run bootstrap` | Полностью подготовить локальное окружение |
| `pnpm run dev` | Одновременно запустить API и веб-приложение |
| `pnpm run db:up` | Запустить PostgreSQL и дождаться готовности |
| `pnpm run db:down` | Остановить контейнеры проекта |
| `pnpm run db:logs` | Показать логи PostgreSQL |

Команды сборки, тестирования, проверки и генерации кода описаны в README отдельных приложений:

- [API](api/README.md)
- [Web](web/README.md)

## Структура репозитория

```text
stageby/
├── api/         # Fastify API, схема БД и миграции
├── contracts/   # общий OpenAPI-контракт
├── docs/        # правила разработки и технические руководства
├── scripts/     # служебные скрипты проекта
├── web/         # React-приложение
└── compose.yaml # локальный PostgreSQL
```

## Работа с контрактом

Источник истины для HTTP API — `contracts/openapi.yaml`. После его изменения обновите сгенерированный код обоих приложений:

```sh
pnpm --dir api run codegen
pnpm --dir web run codegen
```

Файлы в `api/src/generated` и `web/src/generated` вручную не редактируются.

## Документация

- [Разработка API-модулей](docs/api-modules-guidelines.md)
- [Работа с базой данных и миграциями](docs/database-guidelines.md)
