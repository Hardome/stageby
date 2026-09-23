import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import { parseEnvironment } from './config/env.js';

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('application', () => {
  it('serves the OpenAPI contract through Swagger UI', async () => {
    const environment = parseEnvironment({
      NODE_ENV: 'test',
      HOST: '127.0.0.1',
      PORT: '3001',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/stageby_test',
      CORS_ORIGIN: 'http://localhost:5173',
      RATE_LIMIT_MAX: '100',
      RATE_LIMIT_TIME_WINDOW: '1 minute',
    });

    const app = await buildApp({ environment });

    apps.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      info: {
        title: 'Stageby API',
        version: '0.0.0',
      },
      paths: {},
    });
  });
});
