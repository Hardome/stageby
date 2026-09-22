# Stageby

Приложение для поэтапного строительства.

## Быстрый старт

Понадобятся Node.js 24+, PNPM 11+ и Docker с Compose.

```sh
pnpm run bootstrap
```

Команда создаёт отсутствующие `.env` из `.env.example`, устанавливает зависимости API, запускает PostgreSQL и применяет миграции. Существующие `.env` не перезаписываются.

## База данных

```sh
pnpm run db:up
pnpm run db:down
pnpm run db:logs
```
