# Правила разработки API-модулей и репозиториев

Новая сущность размещается в собственной папке `api/src/modules/<имя>/`. Ориентир — [модуль todos](../api/src/modules/todos/index.ts). В `api/src` не создаём отдельные папки сущностей рядом с `plugins`, `db` и `generated`.

## Структура модуля

| Файл на примере todos | За что отвечает |
| --- | --- |
| [index.ts](../api/src/modules/todos/index.ts) | Подключает маршруты и создаёт репозиторий, получая БД из `app.db`. |
| [routes.ts](../api/src/modules/todos/routes.ts) | HTTP: пути, схемы Zod, статусы, обработка отсутствующей записи. Не содержит SQL. |
| [types.ts](../api/src/modules/todos/types.ts) | Собирает типы модуля из генерации OpenAPI и схемы БД. Не дублирует поля вручную. |
| [repository.ts](../api/src/modules/todos/repository.ts) | Запросы к БД и операции над записями. Не знает о Fastify, статусах HTTP и формате ответа. |
| [mapper.ts](../api/src/modules/todos/mapper.ts) | Только нужные преобразования между записью БД и типом ответа. |
| [todos.test.ts](../api/src/modules/todos/todos.test.ts) | Проверяет модуль через HTTP и реальный PostgreSQL. |

Не создавайте файлы «про запас». Например, `service.ts` нужен, когда появляется бизнес-логика, которой не место ни в маршруте, ни в запросе к БД. Если преобразований данных нет, `mapper.ts` тоже не нужен.

## Типы и границы

- Контракт HTTP живёт в [OpenAPI](../contracts/references/stageby/stageby.yaml), который объединяет файлы сущностей. Типы и схемы из [generated](../api/src/generated) руками не правим. [types.ts](../api/src/modules/todos/types.ts) экспортирует `Todo`, `CreateTodo`, `UpdateTodo` и типы, нужные модулю; поля повторно не описываем.
- Таблица находится в [db/schema/todos.ts](../api/src/db/schema/todos.ts), а тип `TodoRow` выводится из неё. Новую таблицу экспортируйте из [db/schema/index.ts](../api/src/db/schema/index.ts). SQL-миграции остаются общими в [db/migrations](../api/src/db/migrations).
- [Репозиторий](../api/src/modules/todos/repository.ts) принимает входные типы из контракта и возвращает `TodoRow` либо `null`, если запись не найдена. Он не формирует HTTP-ошибки и не скрывает ошибки БД.
- [Маршруты](../api/src/modules/todos/routes.ts) используют сгенерированные Zod-схемы, вызывают репозиторий и выбирают HTTP-статус. [mapper.ts](../api/src/modules/todos/mapper.ts) превращает `Date` из PostgreSQL в строки для `Todo`. Не копируйте поля через отдельный слой, если преобразования не нужны.
- Общая инфраструктура остаётся в [plugins](../api/src/plugins), обработчик ошибок — в [plugins/error-handler.ts](../api/src/plugins/error-handler.ts). [app.ts](../api/src/app.ts) только настраивает приложение и подключает модули.

## Импорты

В рукописном TypeScript используйте `#app/*` для файлов `api/src` и `#test/*` для тестовых помощников. Например, импорты [репозитория todos](../api/src/modules/todos/repository.ts) ведут к схеме через `#app/db/schema/todos`, а не через `../../`. Расширение `.js` в исходных импортах не пишем. Префиксы определены в [package.json](../api/package.json); для тестов они также настроены в [vitest.config.ts](../api/vitest.config.ts).

## Создание или изменение сущности

1. Опишите или обновите маршруты в [OpenAPI](../contracts/references/stageby/stageby.yaml), затем из корня Stageby выполните `pnpm run codegen`.
2. Если меняется хранение, следуйте [руководству по БД и миграциям](database-guidelines.md): обновите схему, проверьте созданный SQL и примените миграцию.
3. Создайте файлы модуля по таблице выше. Операции с данными держите в `repository.ts`, HTTP-логику — в `routes.ts`; модуль подключите в [app.ts](../api/src/app.ts).
4. Добавьте интеграционный тест модуля по образцу [todos.test.ts](../api/src/modules/todos/todos.test.ts). Общую настройку Fastify и соединения с БД берите из [test/setup-module-test.ts](../api/test/setup-module-test.ts), не повторяйте её в каждом модуле. Тесты требуют запущенного PostgreSQL с применёнными миграциями; созданные тестом записи удаляйте по их ID, не очищая всю таблицу. Один экземпляр приложения используется повторно внутри тестового файла, но не между модулями; сборку всего приложения проверяет [app.test.ts](../api/src/app.test.ts).
5. Перед завершением выполните `pnpm run test`, `pnpm run typecheck` и `pnpm run lint` из `api`. Если менялся контракт или импорты, проверьте также `pnpm run build`.

При изменении существующей сущности обновляйте только затронутые слои, но проверяйте весь путь «HTTP → репозиторий → БД → HTTP» интеграционным тестом.
