# Baseline фазы 1: контракты и БД

Дата фиксации: 2026-09-29.

Исходный commit: `76815070e7cf3fd9275488c153474e4fa38dda74`.

## Пользовательские изменения до начала фазы

Все перечисленные изменения уже находились в индексе и не должны быть случайно перезаписаны:

- `A plans/План переработки контрактов и БД.md`
- `A plans/Пошаговый чек-лист реализации контрактов и БД.md`
- `A plans/ТЗ на разработку страницы и сценарии.md`
- `M web/vite.config.ts`

## Результаты baseline-проверок

| Проверка | Результат |
| --- | --- |
| `pnpm --dir contracts run lint` | Пройдена |
| `pnpm --dir api run type-check` | Не запускается: в `api/package.json` нет такого script |
| `pnpm --dir api run typecheck` | Пройдена |
| `pnpm --dir api run test` | Пройдена: до fixture — 10 файлов и 45 тестов; после — 11 файлов и 46 тестов |
| `pnpm run db:up` | Пройдена: контейнер `stageby-postgres-1` перешёл в состояние `Healthy` |
| Подключение к `DATABASE_URL` | Пройдено: доступен PostgreSQL 18.6, база `stageby` |
| Миграции на чистой временной БД | Пройдены в `api/test/migrations.test.ts` |

Тест миграций создаёт отдельную пустую БД, применяет три миграции `0001`–`0003`, повторно запускает migrator и сверяет схему. Поэтому он одновременно фиксирует чистый baseline и идемпотентность повторного запуска. Исходное несоответствие, не относящееся к задаче: в первоначальном чек-листе было указано ошибочное имя команды `type-check`; фактический script называется `typecheck`.

## Схема БД до переработки

### Enum

- `user_role`: `manager`, `estimator`, `foreman`, `inspector`
- `stage_type`: `foundation`, `walls`, `roof`, `windows`, `facade`, `electrical`, `plaster`, `heating`
- `stage_status`: `created`, `assigned`, `supplied`, `started`, `in_progress`, `acceptance`, `completed`
- `acceptance_decision`: `accepted`, `rejected`

### Таблицы

- `users`
- `sessions`
- `projects`
- `stages`
- `stage_predecessors`
- `checklists`
- `checklist_items`
- `acceptances`
- `acceptance_items`

Схема также содержит 17 прикладных индексов, 13 внешних ключей и 33 `CHECK`-ограничения; точный перечень проверяется в `api/test/migrations.test.ts`.

## Операции текущего OpenAPI-контракта

- Auth: `login`, `logout`, `getCurrentUser`
- Users: `listUsers`, `createUser`, `getUser`, `updateUser`, `setUserPassword`
- Projects: `listProjects`, `createProject`, `getProject`, `updateProject`
- Stages: `listStages`, `listProjectStages`, `getStage`, `updateStage`, `changeStageStatus`, `acceptStage`, `returnStageForRework`
- Checklists: `getStageChecklist`, `configureStageChecklist`, `updateChecklistItem`

В Fastify на момент фиксации зарегистрированы только модули Auth и Users. Операции Projects, Stages и Checklists присутствуют в контракте и сгенерированных типах, но их серверные модули ещё не подключены.

## Набор данных предыдущей версии

Файл `api/test/fixtures/pre-contracts-rework.sql` заполняет все девять таблиц и покрывает:

- все значения четырёх enum;
- заполненные и отсутствующие необязательные поля проекта;
- активного и архивного клиента, активных и отключённого пользователей;
- цепочку из восьми этапов и все прежние статусы этапа;
- завершённые и незавершённый пункты чек-листа;
- принятую и отклонённую приёмку;
- сессию, чтобы upgrade не потерял существующие ресурсы.

Набор применяется после миграций `0001`–`0003`. Тест `api/test/pre-contracts-rework-fixture.test.ts` собирает временную папку только с этими тремя миграциями, разворачивает отдельную БД, загружает fixture и проверяет количество записей и покрытие enum. Для будущего upgrade-теста порядок воспроизведения фиксирован: создать пустую БД, применить миграции `0001`–`0003`, загрузить fixture, затем применить новые миграции и сверить преобразованные данные.
