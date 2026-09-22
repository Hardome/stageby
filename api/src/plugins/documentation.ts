import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

const contractPath = fileURLToPath(new URL('../../../contracts/openapi.yaml', import.meta.url));

export async function registerDocumentation(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    mode: 'static',
    specification: {
      path: contractPath,
      baseDir: dirname(contractPath),
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
  });
}
