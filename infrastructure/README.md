# Локальная инфраструктура Stageby

Корневой `compose.yaml` запускает PostgreSQL и MinIO для разработки.
`minio/Dockerfile` собирает локальный S3-совместимый сервис.

Выполняйте из корня репозитория `pnpm run db:up` и `pnpm run dev`.
