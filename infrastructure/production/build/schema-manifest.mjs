import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const repositoryRoot = new URL('../../../', import.meta.url);
const migrationsDirectory = new URL('api/src/db/migrations/', repositoryRoot);

function readJson(url) {
  return JSON.parse(readFileSync(url, 'utf8'));
}

const compatibility = readJson(new URL('api/schema-compatibility.json', repositoryRoot));
const journal = readJson(new URL('meta/_journal.json', migrationsDirectory));

// Хешируются исходные байты SQL: readiness сверяет их с журналом Drizzle в БД.
const migrations = journal.entries.map(({ tag, when }) => {
  const sql = readFileSync(new URL(`${tag}.sql`, migrationsDirectory));

  return {
    name: tag,
    timestamp: when,
    hash: createHash('sha256').update(sql).digest('hex'),
  };
});

const manifest = {
  compatibilityVersion: compatibility.version,
  migrations,
};

// Dockerfile сохраняет stdout в файл, общий для образов API и мигратора.
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
