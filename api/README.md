# Stageby API

Серверная часть Stageby на Fastify и TypeScript. 
API использует OpenAPI как источник типов и схем валидации, Zod для проверки данных и Drizzle ORM для работы с PostgreSQL.

## Быстрый старт

Проще всего подготовить весь проект командой из корня репозитория:

```sh
pnpm run bootstrap
pnpm run dev
```

Для отдельного запуска API нужны Node.js 24+, pnpm 11+ и доступный PostgreSQL:

1. Скопируйте `.env.example` в `.env` и при необходимости измените настройки.
2. Выполните команды из каталога `api`:

```sh
pnpm install
pnpm run codegen
pnpm run db:migrate
pnpm run dev
```

По умолчанию API доступно по адресу [http://127.0.0.1:3001](http://127.0.0.1:3001), интерактивная документация — по адресу [http://127.0.0.1:3001/documentation](http://127.0.0.1:3001/documentation).

## Переменные окружения

| Переменная | Значение по умолчанию в `.env.example` | Назначение |
| --- | --- | --- |
| `NODE_ENV` | `development` | Режим работы: `development`, `test` или `production` |
| `HOST` | `127.0.0.1` | Адрес, на котором слушает сервер |
| `PORT` | `3001` | Порт HTTP-сервера |
| `LOG_LEVEL` | `debug` | Уровень логирования |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/stageby` | Строка подключения к PostgreSQL |
| `CORS_ORIGIN` | `http://localhost:3000` | Разрешённые источники CORS через запятую |
| `RATE_LIMIT_MAX` | `100` | Максимум запросов за заданное окно |
| `RATE_LIMIT_TIME_WINDOW` | `1 minute` | Окно ограничения частоты запросов |

## Команды

| Команда | Назначение |
| --- | --- |
| `pnpm run dev` | Запустить сервер с перезапуском при изменениях |
| `pnpm run build` | Обновить сгенерированный код и собрать проект в `dist` |
| `pnpm run start` | Запустить собранный сервер |
| `pnpm run codegen` | Сгенерировать типы и схемы из OpenAPI-контракта |
| `pnpm run typecheck` | Проверить типы TypeScript |
| `pnpm run lint` | Запустить Biome с автоматическим исправлением, cspell, проверку типов и Knip |
| `pnpm run lint:knip` | Найти неиспользуемые файлы, экспорты и зависимости |
| `pnpm run test` | Однократно запустить тесты |
| `pnpm run test:watch` | Запустить тесты в режиме наблюдения |
| `pnpm run db:generate` | Создать SQL-миграцию по изменениям схемы |
| `pnpm run db:migrate` | Применить ещё не выполненные миграции |
| `pnpm run db:studio` | Открыть Drizzle Studio |

Для проверки Knip используйте `pnpm run lint:knip`: команда передаёт `tsconfig.build.json`, чтобы корректно сопоставлять импорты из `dist` с исходниками в `src`.

Интеграционным тестам требуется доступная база из `DATABASE_URL`. Локальный PostgreSQL можно запустить из корня репозитория командой `pnpm run db:up`.

## Структура

```text
api/
├── src/
│   ├── config/         # разбор и проверка конфигурации
│   ├── db/
│   │   ├── migrations/ # SQL-миграции Drizzle
│   │   └── schema/     # схема базы данных
│   ├── generated/      # код, сгенерированный из OpenAPI
│   ├── modules/        # бизнес-модули и HTTP-маршруты
│   ├── plugins/        # плагины Fastify
│   ├── app.ts          # сборка приложения
│   └── server.ts       # точка запуска сервера
└── test/               # общая инфраструктура тестов
```

Правила структуры модулей, импортов и репозиториев описаны в [руководстве по API-модулям](../docs/api-modules-guidelines.md). За рабочий пример можно взять модуль `todos`.

## Контракт и генерация кода

Источник истины — [`contracts/references/stageby/stageby.yaml`](../contracts/references/stageby/stageby.yaml), объединяющий файлы сущностей. После изменения исходников выполните из корня Stageby `pnpm --dir contracts run generate`, чтобы обновить собранный `contracts/openapi.yaml`. Команда `pnpm run codegen` читает этот файл, обновляет `src/generated` и затем проверяет типы. Сгенерированные файлы вручную не редактируются. Новые предметные маршруты пока описаны только контрактом; реализован демонстрационный модуль `todos`.

Если контракт используется веб-приложением, после изменения также выполните из корня:

```sh
pnpm --dir web run codegen
```

## База данных и миграции

Схемы таблиц находятся в `src/db/schema`, SQL-миграции — в `src/db/migrations`. После изменения схемы выполните:

```sh
pnpm run db:generate
pnpm run db:migrate
```

`db:generate` создаёт миграцию, но не изменяет базу. `db:migrate` применяет только ещё не выполненные миграции и записывает их в журнал Drizzle. Подробности и порядок отката описаны в [руководстве по базе данных](../docs/database-guidelines.md).
