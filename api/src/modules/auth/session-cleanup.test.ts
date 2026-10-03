import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerSessionCleanup } from '#app/modules/auth/session-cleanup';
import { SessionRepository } from '#app/modules/auth/session-repository';

describe('Периодическая очистка сессий', () => {
  it('не запускает параллельную очистку и дожидается её при остановке', async () => {
    vi.useFakeTimers();
    const app = Fastify();
    const pending = Promise.withResolvers<number>();
    const cleanup = vi.spyOn(SessionRepository.prototype, 'deleteExpired').mockReturnValue(pending.promise);
    // No database calls are made: the repository method is controlled by the test.
    registerSessionCleanup(app, new SessionRepository(app.db), 10);
    try {
      await app.ready();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(cleanup).toHaveBeenCalledTimes(1);
      let closed = false;
      const closing = app.close().then(() => {
        closed = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(closed).toBe(false);
      pending.resolve(1);
      await closing;
      await vi.advanceTimersByTimeAsync(30_000);
      expect(cleanup).toHaveBeenCalledTimes(1);
    } finally {
      pending.resolve(0);
      await app.close();
      vi.useRealTimers();
    }
  });

  it('записывает ошибку и повторяет попытку на следующем интервале', async () => {
    vi.useFakeTimers();
    const app = Fastify();
    const error = new Error('Database unavailable');
    const cleanup = vi
      .spyOn(SessionRepository.prototype, 'deleteExpired')
      .mockRejectedValueOnce(error)
      .mockResolvedValue(0);
    const log = vi.spyOn(app.log, 'error');
    registerSessionCleanup(app, new SessionRepository(app.db), 10);
    try {
      await app.ready();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(cleanup).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalledWith({ err: error }, expect.any(String));
    } finally {
      await app.close();
      vi.useRealTimers();
    }
  });
});
