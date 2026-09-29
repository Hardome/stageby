import type { FastifyPluginAsync } from 'fastify';

import { cleanupExpiredFiles } from '#app/modules/files/cleanup';
import { FileRepository } from '#app/modules/files/repository';
import { registerFileRoutes } from '#app/modules/files/routes';
import type { FileStorage } from '#app/storage/file-storage';

interface FileModuleOptions {
  storage: FileStorage;
  signedUrlTtlSeconds: number;
  cleanupIntervalSeconds: number;
}

export const fileModule: FastifyPluginAsync<FileModuleOptions> = async (app, options) => {
  const repository = new FileRepository(app.db, options.storage, options.signedUrlTtlSeconds);
  registerFileRoutes(app, repository);

  let cleanupRunning = false;
  const timer = setInterval(() => {
    if (cleanupRunning) return;
    cleanupRunning = true;
    void cleanupExpiredFiles(repository, app.log).finally(() => {
      cleanupRunning = false;
    });
  }, options.cleanupIntervalSeconds * 1000);
  timer.unref();
  app.addHook('onClose', () => clearInterval(timer));
};
