import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { registerSecurity } from '#app/plugins/security';

async function createApp(trustProxy: string[] = [], max = 100) {
  const app = Fastify({ trustProxy: trustProxy.length > 0 ? trustProxy : false });
  const environment = parseEnvironment({
    DATABASE_URL: 'postgresql://localhost/stageby',
    CORS_ORIGIN: 'https://app.example',
    API_PUBLIC_ORIGIN: 'https://api.example',
    RATE_LIMIT_MAX: String(max),
  });
  await registerSecurity(app, environment);
  app.post('/change', (request) => ({ ip: request.ip }));
  app.get('/private', (_request, reply) => reply.status(401).send({ error: 'unauthenticated' }));
  return app;
}

describe('Защита запросов', () => {
  it('разрешает доверенные origin и fallback Referer', async () => {
    const app = await createApp();
    try {
      for (const headers of [
        { origin: 'https://app.example' },
        { origin: 'https://api.example' },
        { referer: 'https://app.example/users?offset=20' },
      ]) {
        const response = await app.inject({ method: 'POST', url: '/change', headers });
        expect(response.statusCode).toBe(200);
        expect(response.headers['cache-control']).toBe('no-store');
      }
    } finally {
      await app.close();
    }
  });

  it('не доверяет Host, другому протоколу, null и отсутствующему источнику', async () => {
    const app = await createApp();
    try {
      for (const headers of [
        {},
        { cookie: 'stageby_session=test' },
        { origin: 'null' },
        { origin: 'invalid' },
        { origin: 'http://api.example' },
        { origin: 'https://app.example:444' },
        { origin: 'https://app.example/path' },
        { referer: 'https://app.example.attacker.test/' },
        { origin: 'https://attacker.test', host: 'attacker.test' },
        { origin: 'null', referer: 'https://app.example/' },
        { 'sec-fetch-site': 'same-origin' },
      ]) {
        const response = await app.inject({ method: 'POST', url: '/change', headers });
        expect(response.statusCode).toBe(403);
        expect(response.headers['cache-control']).toBe('no-store');
      }
    } finally {
      await app.close();
    }
  });

  it('запрещает кэширование ошибок и ответов ограничения частоты', async () => {
    const app = await createApp([], 1);
    try {
      const first = await app.inject({ method: 'GET', url: '/private' });
      const second = await app.inject({ method: 'GET', url: '/private' });
      expect(first.statusCode).toBe(401);
      expect(second.statusCode).toBe(429);
      expect(first.headers['cache-control']).toBe('no-store');
      expect(second.headers['cache-control']).toBe('no-store');
      expect(second.headers['retry-after']).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it('разделяет лимиты клиентов за доверенным прокси и игнорирует поддельный IP', async () => {
    const app = await createApp(['127.0.0.1'], 1);
    try {
      for (const ip of ['192.0.2.1', '192.0.2.2']) {
        const response = await app.inject({
          method: 'POST',
          url: '/change',
          remoteAddress: '127.0.0.1',
          headers: { origin: 'https://app.example', 'x-forwarded-for': ip },
        });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ ip });
      }
      const first = await app.inject({
        method: 'POST',
        url: '/change',
        remoteAddress: '192.0.2.3',
        headers: { origin: 'https://app.example', 'x-forwarded-for': '192.0.2.4' },
      });
      const second = await app.inject({
        method: 'POST',
        url: '/change',
        remoteAddress: '192.0.2.3',
        headers: { origin: 'https://app.example', 'x-forwarded-for': '192.0.2.5' },
      });
      expect(first.json()).toEqual({ ip: '192.0.2.3' });
      expect(second.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });
});
