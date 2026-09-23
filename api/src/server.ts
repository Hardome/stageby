import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

import { buildApp } from '#app/app';
import { parseEnvironment } from '#app/config/env';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const environment = parseEnvironment(process.env);

const app = await buildApp({ environment });

let isShuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  app.log.info({ signal }, 'Shutting down');

  try {
    await app.close();
  } catch (error) {
    app.log.error({ error }, 'Не удалось корректно остановить сервер');
    process.exitCode = 1;
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({
    host: environment.HOST,
    port: environment.PORT,
  });
} catch (error) {
  app.log.error({ error }, 'Не удалось запустить сервер');
  process.exitCode = 1;
  await app.close();
}
