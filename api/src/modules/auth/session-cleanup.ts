import type { FastifyInstance } from 'fastify';

import type { SessionRepository } from '#app/modules/auth/session-repository';

export function registerSessionCleanup(
  app: FastifyInstance,
  repository: SessionRepository,
  intervalSeconds: number,
): void {
  let running: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (running) return;
    running = repository
      .deleteExpired()
      .then(() => {})
      .catch((error: unknown) => {
        app.log.error({ err: error }, 'Не удалось очистить истёкшие сессии');
      })
      .finally(() => {
        running = undefined;
      });
  }, intervalSeconds * 1000);
  timer.unref();
  app.addHook('onClose', async () => {
    clearInterval(timer);
    await running;
  });
}
