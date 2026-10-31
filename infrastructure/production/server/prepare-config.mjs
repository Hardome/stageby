import { randomBytes } from 'node:crypto';
import { chmodSync, closeSync, existsSync, lstatSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const directory = resolve(process.argv[2] ?? '/config');
const templates = resolve(process.argv[3] ?? '/templates');

function fromTemplate(name, replacements) {
  let content = readFileSync(join(templates, `${name}.example`), 'utf8').replaceAll('\r\n', '\n');
  for (const [variable, value] of Object.entries(replacements)) {
    const pattern = new RegExp(`^${variable}=.*$`, 'gm');
    if ([...content.matchAll(pattern)].length !== 1) {
      throw new Error(`Expected exactly one ${variable} in ${name}.example`);
    }
    content = content.replace(pattern, (line) => {
      const replacement = typeof value === 'function' ? value(line.slice(variable.length + 1)) : value;
      return `${variable}=${replacement}`;
    });
  }
  return content;
}

function withCredentials(username, password) {
  return (connection) => {
    const url = new URL(connection);
    url.username = username;
    url.password = password;
    return url.href;
  };
}

try {
  const info = lstatSync(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error('Configuration path must be an existing directory, not a symlink');
  }

  const administrator = randomBytes(32).toString('hex');
  const migrator = randomBytes(32).toString('hex');
  const application = randomBytes(32).toString('hex');
  const files = new Map([
    [
      'database.env',
      fromTemplate('database.env', {
        POSTGRES_DB: 'stageby',
        POSTGRES_USER: 'stageby_admin',
        POSTGRES_PASSWORD: administrator,
      }),
    ],
    [
      'migrator.env',
      fromTemplate('migrator.env', {
        DATABASE_URL: withCredentials('stageby_migrator', migrator),
      }),
    ],
    [
      'api.env',
      fromTemplate('api.env', {
        DATABASE_URL: withCredentials('stageby_api', application),
      }),
    ],
    [
      'database-init.sql',
      `BEGIN;
CREATE ROLE stageby_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${migrator}';
CREATE ROLE stageby_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${application}';
ALTER DATABASE stageby OWNER TO stageby_migrator;
REVOKE ALL ON DATABASE stageby FROM PUBLIC;
GRANT CONNECT ON DATABASE stageby TO stageby_api;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO stageby_migrator;
GRANT USAGE ON SCHEMA public TO stageby_api;
CREATE SCHEMA drizzle AUTHORIZATION stageby_migrator;
CREATE SCHEMA stageby_deployment AUTHORIZATION stageby_migrator;
GRANT USAGE ON SCHEMA drizzle, stageby_deployment TO stageby_api;
ALTER DEFAULT PRIVILEGES FOR ROLE stageby_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO stageby_api;
ALTER DEFAULT PRIVILEGES FOR ROLE stageby_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO stageby_api;
ALTER DEFAULT PRIVILEGES FOR ROLE stageby_migrator IN SCHEMA drizzle, stageby_deployment
  GRANT SELECT ON TABLES TO stageby_api;
COMMIT;
`,
    ],
  ]);

  // Повторный запуск не должен менять пароли уже созданной БД.
  for (const name of files.keys()) {
    if (existsSync(join(directory, name))) {
      throw new Error(`Configuration already exists: ${name}. Existing files were not changed.`);
    }
  }

  const created = [];
  chmodSync(directory, 0o700);
  try {
    for (const [name, content] of files) {
      const path = join(directory, name);
      const descriptor = openSync(path, 'wx', 0o600);
      created.push(path);
      try {
        writeFileSync(descriptor, content);
      } finally {
        closeSync(descriptor);
      }
    }
  } catch (error) {
    for (const path of created) unlinkSync(path);
    throw error;
  }

  console.log('Created database.env, migrator.env, api.env and database-init.sql. Secrets were not printed.');
  console.log('Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in api.env before starting the API.');
  console.log('Database roles and migrations have not been applied.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
