import type { FastifyBaseLogger } from 'fastify';

import type { FileRepository } from '#app/modules/files/repository';

export async function cleanupExpiredFiles(repository: FileRepository, logger: FastifyBaseLogger): Promise<void> {
  const now = new Date();
  for (const fileId of await repository.findExpiredFileIds(now)) {
    try {
      await repository.deleteExpiredFile(fileId, now, { source: 'system' });
    } catch (error) {
      logger.warn({ error, fileId }, 'Не удалось удалить просроченный файл; операция будет повторена');
    }
  }
}
