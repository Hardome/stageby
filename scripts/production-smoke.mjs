import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:https';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const configDirectory = mkdtempSync(join(tmpdir(), 'stageby-smoke-'));
const projectName = `stageby-smoke-${Date.now()}`;
const testPassword = randomBytes(24).toString('hex');
const testOrigin = 'https://localhost:18443';
const testDatabaseUrl = `postgresql://stageby:${testPassword}@postgres:5432/stageby`;

const composeArgs = [
  'compose',
  '--project-name',
  projectName,
  '--file',
  'infrastructure/production/runtime/compose.yaml',
  '--file',
  join(configDirectory, 'override.yaml'),
];

const composeEnvironment = {
  ...process.env,
  STAGEBY_CONFIG_DIR: configDirectory,
  RELEASE_ID: process.env.RELEASE_ID ?? 'local',
  APP_ADDRESS: 'localhost',
};

function runDocker(args, { captureOutput = false } = {}) {
  const result = spawnSync('docker', args, {
    cwd: repositoryRoot,
    env: composeEnvironment,
    encoding: 'utf8',
    stdio: captureOutput ? 'pipe' : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Docker failed: ${captureOutput ? result.stderr : result.status}`);
  }

  return result.stdout?.trim();
}

function runCompose(args, options) {
  return runDocker([...composeArgs, ...args], options);
}

function queryDatabase(statement) {
  return runCompose(['exec', '-T', 'postgres', 'psql', '-U', 'stageby', '-d', 'stageby', '-Atc', statement], {
    captureOutput: true,
  });
}

function readInternalStatus(path) {
  const probe = `fetch('http://127.0.0.1:3001${path}').then(response => console.log(response.status))`;

  // Служебные маршруты доступны внутри API-контейнера, но закрыты через Caddy.
  const status = runCompose(['exec', '-T', 'api', 'node', '-e', probe], { captureOutput: true });

  return Number(status);
}

function requestLocalHttps(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    // Только этот тестовый клиент доверяет локальному сертификату Caddy.
    const options = { method, headers, rejectUnauthorized: false, timeout: 5000 };
    const req = request(`${testOrigin}${path}`, options, (response) => {
      let text = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        text += chunk;
      });
      response.on('end', () => {
        resolve({ status: response.statusCode, headers: response.headers, text });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.end(body);
  });
}

function writeEnvironmentFile(name, values) {
  const content = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  writeFileSync(join(configDirectory, name), `${content}\n`);
}

async function waitForFrontend() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await requestLocalHttps('/');

      if (response.status === 200) {
        return response;
      }
    } catch {
      // Запущенный контейнер Caddy ещё может готовить локальный сертификат.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Frontend did not become ready');
}

let keepTestStack = false;

try {
  // Случайные credentials относятся только к пустой БД этого временного стенда.
  writeEnvironmentFile('database.env', {
    POSTGRES_DB: 'stageby',
    POSTGRES_USER: 'stageby',
    POSTGRES_PASSWORD: testPassword,
  });
  writeEnvironmentFile('migrator.env', { DATABASE_URL: testDatabaseUrl });
  writeEnvironmentFile('api.env', {
    DATABASE_URL: testDatabaseUrl,
    // S3 намеренно недоступен: запуск и liveness API не должны от него зависеть.
    S3_ENDPOINT: 'http://127.0.0.1:1',
    S3_REGION: 'ru1',
    S3_BUCKET: 'smoke',
    S3_ACCESS_KEY_ID: 'smoke',
    S3_SECRET_ACCESS_KEY: 'smoke',
    FIRST_MANAGER_LOGIN: 'smoke.manager',
    FIRST_MANAGER_PASSWORD: testPassword,
    FIRST_MANAGER_FULL_NAME: 'Smoke Manager',
  });

  // Без !override Compose добавил бы тестовый порт к публичным портам production.
  const localOverride = [
    'services:',
    '  api:',
    '    environment:',
    `      CORS_ORIGIN: ${testOrigin}`,
    `      API_PUBLIC_ORIGIN: ${testOrigin}`,
    '  web:',
    '    ports: !override',
    "      - '127.0.0.1:18443:443'",
  ].join('\n');

  writeFileSync(join(configDirectory, 'override.yaml'), `${localOverride}\n`);

  // Установка схемы на пустую БД и проверка повторного запуска.
  runCompose(['up', '-d', '--wait', 'postgres']);
  runCompose(['run', '--rm', 'migrator']);

  const migrationCount = queryDatabase('select count(*) from drizzle.__drizzle_migrations');
  assert.ok(Number(migrationCount) > 0);

  // Повторный запуск не должен повторно применять уже завершённые миграции.
  runCompose(['run', '--rm', 'migrator']);
  assert.equal(queryDatabase('select count(*) from drizzle.__drizzle_migrations'), migrationCount);
  runCompose(['up', '-d', '--wait', 'api', 'web']);

  assert.equal(readInternalStatus('/health/live'), 200);
  assert.equal(readInternalStatus('/health/ready'), 200);
  assert.equal(readInternalStatus('/documentation/json'), 404);

  // Проверка HTML, кеширования, маршрутов API и закрытых служебных путей.
  const home = await waitForFrontend();

  assert.match(home.headers['cache-control'], /no-cache/);
  assert.match(home.headers['content-security-policy'], /script-src 'self' 'wasm-unsafe-eval'/);
  assert.doesNotMatch(home.headers['content-security-policy'], /'unsafe-eval'/);
  assert.equal(home.headers['content-security-policy-report-only'], undefined);
  assert.match(home.text, /<html/);
  assert.equal((await requestLocalHttps('/projects/123')).text, home.text);

  const assetMatch = home.text.match(/(?:src|href)="(\/assets\/[^\"]+)"/);
  assert.ok(assetMatch, 'Frontend HTML must reference a built asset');
  const assetResponse = await requestLocalHttps(assetMatch[1]);

  assert.match(assetResponse.headers['cache-control'], /immutable/);
  assert.equal((await requestLocalHttps('/assets/missing.js')).status, 404);

  for (const path of ['/api/health/live', '/api/health/ready', '/api/documentation/json']) {
    assert.equal((await requestLocalHttps(path)).status, 404);
  }

  const anonymousResponse = await requestLocalHttps('/api/auth/me');
  assert.equal(anonymousResponse.status, 401);
  assert.match(anonymousResponse.headers['cache-control'], /no-store/);
  // Проверка Origin, входа, cookies и защиты от подмены IP.
  const loginRequest = {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: testOrigin },
    body: JSON.stringify({ login: 'smoke.manager', password: testPassword }),
  };
  const foreignOriginResponse = await requestLocalHttps('/api/auth/login', {
    ...loginRequest,
    headers: { ...loginRequest.headers, origin: 'https://untrusted.invalid' },
  });

  assert.equal(foreignOriginResponse.status, 403);
  runCompose(['exec', '-T', 'api', 'node', 'dist/commands/create-first-manager.js']);

  const signedIn = await requestLocalHttps('/api/auth/login', loginRequest);
  assert.equal(signedIn.status, 200);

  const sessionCookie = signedIn.headers['set-cookie'].find((value) => value.startsWith('stageby_session='));

  assert.match(sessionCookie, /HttpOnly/i);
  assert.match(sessionCookie, /Secure/i);
  assert.match(sessionCookie, /SameSite=Lax/i);

  const sessionResponse = await requestLocalHttps('/api/auth/me', {
    headers: { cookie: sessionCookie.split(';')[0] },
  });
  assert.equal(sessionResponse.status, 200);

  // Смена присланного клиентом IP не должна обходить лимит входа через Caddy.
  let loginLimited = false;

  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await requestLocalHttps('/api/auth/login', {
      ...loginRequest,
      headers: { ...loginRequest.headers, 'x-forwarded-for': `192.0.2.${attempt + 1}` },
      body: JSON.stringify({ login: 'missing.manager', password: 'wrong-password' }),
    });

    if (response.status === 429) {
      loginLimited = true;
      break;
    }

    assert.equal(response.status, 401);
  }

  assert.ok(loginLimited, 'Spoofed forwarded addresses must not bypass the login limit');
  // Несовместимая или незавершённая схема блокирует readiness.
  const invalidSchemaStates = ['compatibility_version = 2', 'compatibility_version = 1, migrating = true'];

  for (const state of invalidSchemaStates) {
    queryDatabase(`update stageby_deployment.schema_state set ${state}`);
    assert.equal(readInternalStatus('/health/ready'), 503);
    assert.equal(readInternalStatus('/health/live'), 200);
  }

  queryDatabase('update stageby_deployment.schema_state set compatibility_version = 1, migrating = false');
  assert.equal(readInternalStatus('/health/ready'), 200);
  // Потеря БД меняет readiness, но не должна завершать процесс API.
  runCompose(['stop', 'postgres']);
  assert.equal(readInternalStatus('/health/ready'), 503);
  assert.equal(readInternalStatus('/health/live'), 200);

  runCompose(['up', '-d', '--wait', 'postgres']);
  assert.equal(readInternalStatus('/health/ready'), 200);
  // Проверка пользователя, файловой системы и отсутствия прямого API-порта.
  const containerId = runCompose(['ps', '-q', 'api'], { captureOutput: true });
  const inspection = runDocker(['inspect', containerId], { captureOutput: true });
  const [container] = JSON.parse(inspection);

  assert.equal(container.Config.User, 'node');
  assert.equal(container.HostConfig.ReadonlyRootfs, true);
  assert.deepEqual(container.HostConfig.CapDrop, ['ALL']);
  assert.equal(Object.keys(container.HostConfig.PortBindings ?? {}).length, 0);

  console.log('Production smoke checks passed: migrations, HTTPS, routing, cookies, Origin, health, isolation.');

  // Стенд сохраняется только после успеха и только по явному флагу для браузерной проверки.
  if (process.argv.includes('--keep')) {
    const sessionPath = new URL('../docs/tmp/tasks/production-smoke-session.json', import.meta.url);
    const session = { project: projectName, directory: configDirectory, origin: testOrigin };

    // Пароль остаётся в локальном временном env-файле, а не в описании сессии или логе.
    writeFileSync(sessionPath, JSON.stringify(session));
    console.log(`Kept local stack ${projectName} for browser checks.`);
    keepTestStack = true;
  }
} catch (error) {
  runCompose(['logs', '--tail', '40', 'api', 'web']);
  throw error;
} finally {
  if (!keepTestStack) {
    // Удаляется только временный проект с его тестовыми данными.
    runCompose(['down', '--volumes', '--remove-orphans']);

    // Перед рекурсивным удалением проверяется принадлежность каталога системному tmp.
    const relativeDirectory = relative(tmpdir(), configDirectory);
    assert.ok(relativeDirectory && !relativeDirectory.startsWith('..') && !relativeDirectory.includes(':'));
    rmSync(configDirectory, { recursive: true, force: true });
  }
}
