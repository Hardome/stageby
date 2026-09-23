# Stageby

Приложение для поэтапного строительства.

## Быстрый старт

Понадобятся Node.js 24+, PNPM 11+ и Docker с Compose.

```sh
pnpm run bootstrap
```

Команда создаёт отсутствующие `api/.env` и `web/.env` из примеров, устанавливает зависимости обоих приложений, генерирует код из контрактов и дерево маршрутов, запускает PostgreSQL и применяет миграции. Существующие `.env` не перезаписываются. Перед запуском нужен работающий Docker Engine.

Для запуска API и фронтенда вместе:

```sh
pnpm run dev
```

Фронтенд доступен на `http://localhost:3000`, API — на `http://localhost:3001`. В режиме разработки Vite направляет `/todos` в API; адрес API задаётся через `API_PROXY_TARGET` в `web/.env`.

## База данных

```sh
pnpm run db:up
pnpm run db:down
pnpm run db:logs
```
