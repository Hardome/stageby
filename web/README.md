# Stageby Web

Веб-интерфейс на React и Vite. Подготовка окружения и первый вход описаны в
[корневом README](../README.md#быстрый-старт).

## Отдельный запуск

После общей подготовки запустите API и выполните из каталога `web`:

```sh
pnpm run dev
```

Адрес: [http://localhost:3000](http://localhost:3000).
`API_PROXY_TARGET` в `web/.env` задаёт backend для Vite dev/preview;
по умолчанию `http://127.0.0.1:3001`. В клиентский код не попадает.

## Команды

Команды выполняются из `web`; из корня используйте `pnpm --dir web run <команда>`.

| Команда | Назначение |
| --- | --- |
| `pnpm run dev` | Запустить Vite с HMR |
| `pnpm run check` | Выполнить линтеры, проверку типов, тесты и сборку |
| `pnpm run build` | Обновить generated-код, проверить типы и собрать `dist/` |
| `pnpm run preview` | Локально просмотреть готовую сборку |
| `pnpm run codegen` | Сгенерировать API-клиент и дерево маршрутов |
| `pnpm run typecheck` | Проверить типы |
| `pnpm run lint` | Выполнить Biome, ESLint, Stylelint, Steiger и cspell |
| `pnpm run test` | Запустить Vitest однократно |
| `pnpm run test:watch` | Запустить Vitest в режиме наблюдения |
| `pnpm run test:coverage` | Получить отчёт о покрытии |

`lint` и `check` могут исправлять файлы. `preview` — локальный просмотр сборки.
Остальные команды — в [package.json](package.json).

## Клиент, маршруты и структура

Kubb читает `contracts/openapi.yaml` и создаёт в `src/generated/api/`:

- TypeScript-типы и Zod-схемы;
- Fetch-клиенты;
- query- и mutation-хуки TanStack Query.

После изменения контракта используйте общую команду `pnpm run codegen` из корня репозитория,
чтобы обновить и bundle, и оба приложения.

Из каталога `web`:

- `pnpm run codegen:routes` — обновить дерево после изменения `src/app/routes/`.
- `pnpm run codegen:api` — обновить клиент из готового bundle.

Файлы `src/generated/` вручную не редактируются.

Код организован по слоям `app`, `pages`, `widgets`, `features`, `entities`, `shared`; границы
импортов проверяет Steiger. Правила и примеры — в
[руководстве по web](../docs/rules/web-guidelines.md).

## Руководства

- [Дизайн-система](../docs/rules/design-system.md).
- [Ручной регресс](../docs/guides/regression/README.md).
- [Доступ с телефона и демонстрация сборки](../docs/guides/local-demo.md).
- [Ярлык на главном экране Android и iOS](../docs/guides/install-shortcut.md).
