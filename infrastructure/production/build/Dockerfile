FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS tooling
RUN npm install --global pnpm@12.6.0
WORKDIR /app

FROM tooling AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json api/pnpm-lock.yaml api/pnpm-workspace.yaml ./api/
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./web/
COPY contracts/package.json contracts/pnpm-lock.yaml contracts/pnpm-workspace.yaml ./contracts/
RUN pnpm install --frozen-lockfile --ignore-scripts \
 && pnpm --dir api install --frozen-lockfile \
 && pnpm --dir web install --frozen-lockfile \
 && pnpm --dir contracts install --frozen-lockfile

FROM dependencies AS source
COPY . .

FROM source AS verify
RUN apt-get update \
 && apt-get install --yes --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/*
CMD ["node", "infrastructure/production/checks/verify.mjs"]

FROM source AS contract
RUN pnpm --dir contracts run generate

FROM contract AS api-build
RUN pnpm --dir api run build \
 && node infrastructure/production/build/schema-manifest.mjs > api/schema-manifest.json

FROM contract AS web-build
RUN pnpm --dir web run build

FROM tooling AS runtime-dependencies
COPY api/package.json api/pnpm-lock.yaml api/pnpm-workspace.yaml ./api/
RUN pnpm --dir api install --prod --frozen-lockfile

FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS api
ENV NODE_ENV=production
WORKDIR /app/api
COPY --from=runtime-dependencies --chown=node:node /app/api/package.json ./package.json
COPY --from=runtime-dependencies --chown=node:node /app/api/node_modules ./node_modules
COPY --from=api-build --chown=node:node /app/api/dist ./dist
COPY --from=api-build --chown=node:node /app/api/schema-manifest.json ./schema-manifest.json
COPY --from=contract --chown=node:node /app/contracts/openapi.yaml /app/contracts/openapi.yaml
USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]

FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS migrator
ENV NODE_ENV=production
WORKDIR /app/api
COPY --from=runtime-dependencies --chown=node:node /app/api/package.json ./package.json
COPY --from=runtime-dependencies --chown=node:node /app/api/node_modules ./node_modules
COPY --chown=node:node api/src/db/migrations ./migrations
COPY --chown=node:node infrastructure/production/migrations/migrate.mjs ./migrate.mjs
COPY --from=api-build --chown=node:node /app/api/schema-manifest.json ./schema-manifest.json
USER node
CMD ["node", "migrate.mjs"]

FROM caddy:2.11.2-alpine@sha256:834468128c7696cec0ceea6172f7d692daf645ae51983ca76e39da54a97c570d AS web
COPY infrastructure/production/runtime/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/web/dist /srv
