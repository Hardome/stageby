import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { test as it } from 'node:test';

const id = `stageby-backrest-${Date.now()}-${randomBytes(3).toString('hex')}`;
const temporaryRoot = resolve('docs/tmp/tasks');
const directory = join(temporaryRoot, id);
mkdirSync(temporaryRoot, { recursive: true });
mkdirSync(directory);
const image = process.argv[2] ?? 'stageby-postgres:backrest-local';
const password = randomBytes(24).toString('hex');
const cipher = randomBytes(32).toString('hex');

function docker(args, allowFailure = false) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 180_000 });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${args[0]} failed: ${result.stderr}\n${result.stdout}`);
  }
  return result;
}

const compose = (...args) =>
  docker(['compose', '-p', id, '-f', join(directory, 'compose.json'), '--profile', 'restore', ...args]);
const sql = (statement, service = 'postgres') =>
  compose(
    'exec',
    '-T',
    service,
    'psql',
    '-X',
    '-U',
    'stageby_admin',
    '-d',
    'stageby',
    '-v',
    'ON_ERROR_STOP=1',
    '-Atc',
    statement,
  ).stdout.trim();
const backrest = (...args) =>
  compose('exec', '-T', '--user', 'postgres', 'postgres', 'pgbackrest', '--stanza=stageby', ...args);
const configuration = `[global]
repo1-type=s3
repo1-path=/stageby
repo1-s3-bucket=backups
repo1-s3-endpoint=minio
repo1-s3-region=ru1
repo1-s3-uri-style=path
repo1-s3-key=stageby
repo1-s3-key-secret=${password}
repo1-storage-port=9000
repo1-storage-ca-file=/check/public.crt
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=${cipher}
repo1-retention-full-type=time
repo1-retention-full=30
process-max=1
start-fast=y
log-level-file=off
log-level-console=info

[stageby]
pg1-path=/var/lib/postgresql/18/docker
pg1-user=stageby_admin
pg1-database=stageby
`;
writeFileSync(join(directory, 'pgbackrest.conf'), configuration);
const database = (volume) => ({
  image,
  environment: { POSTGRES_USER: 'stageby_admin', POSTGRES_DB: 'stageby', POSTGRES_PASSWORD: password },
  volumes: [
    `${volume}:/var/lib/postgresql`,
    `${directory}:/check:ro`,
    `${directory}/pgbackrest.conf:/etc/pgbackrest/pgbackrest.conf:ro`,
  ],
  healthcheck: { test: ['CMD', 'pg_isready', '-U', 'stageby_admin', '-d', 'stageby'], interval: '1s', retries: 60 },
  mem_limit: '1g',
  cpus: 1,
});
writeFileSync(
  join(directory, 'compose.json'),
  JSON.stringify(
    {
      services: {
        minio: {
          image: process.env.STAGEBY_BACKUP_MINIO_IMAGE ?? 'stageby-minio:latest',
          entrypoint: ['sh', '-c'],
          command: ['mkdir -p /data/backups && exec minio server /data --certs-dir /certs'],
          environment: { MINIO_ROOT_USER: 'stageby', MINIO_ROOT_PASSWORD: password },
          volumes: ['repository:/data', `${directory}:/certs:ro`],
        },
        postgres: {
          ...database('source'),
          volumes: ['source:/var/lib/postgresql', `${directory}:/check:ro`, 'configuration:/run/stageby:ro'],
          command: [
            'postgres',
            '-c',
            'archive_mode=off',
            '-c',
            'archive_timeout=300',
            '-c',
            'archive_command=pgbackrest --stanza=stageby archive-push %p',
          ],
        },
        restored: { ...database('restored'), profiles: ['restore'] },
        configuration: {
          image,
          entrypoint: ['install'],
          command: [
            '-o',
            'root',
            '-g',
            'root',
            '-m',
            '0600',
            '/check/pgbackrest.conf',
            '/configuration/pgbackrest.conf',
          ],
          volumes: [`${directory}:/check:ro`, 'configuration:/configuration'],
          profiles: ['restore'],
        },
      },
      volumes: { source: {}, restored: {}, repository: {}, configuration: {} },
    },
    null,
    2,
  ),
);

it('pgBackRest encrypted S3 backups and WAL recovery', async () => {
  try {
    docker([
      'run',
      '--rm',
      '-v',
      `${directory}:/work`,
      image,
      'openssl',
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      '/work/private.key',
      '-out',
      '/work/public.crt',
      '-days',
      '1',
      '-subj',
      '/CN=minio',
      '-addext',
      'subjectAltName=DNS:minio',
    ]);
    compose('run', '--rm', '--no-deps', 'configuration');
    compose('up', '-d', '--wait', '--wait-timeout', '90', 'minio', 'postgres');
    assert.equal(
      compose('exec', '-T', 'postgres', 'stat', '-c', '%u:%g:%a', '/run/stageby/pgbackrest.conf').stdout.trim(),
      '0:0:600',
    );
    assert.equal(
      compose('exec', '-T', 'postgres', 'stat', '-c', '%u:%g:%a', '/etc/pgbackrest/pgbackrest.conf').stdout.trim(),
      '999:999:600',
    );
    backrest('stanza-create');
    sql('CREATE TABLE backup_probe (id integer PRIMARY KEY); INSERT INTO backup_probe VALUES (1);');
    const stackPath = join(directory, 'compose.json');
    const stack = JSON.parse(readFileSync(stackPath, 'utf8'));
    stack.services.postgres.command[2] = 'archive_mode=on';
    writeFileSync(stackPath, JSON.stringify(stack, null, 2));
    compose('up', '-d', '--wait', '--wait-timeout', '90', 'postgres');
    assert.equal(sql('SELECT count(*) FROM backup_probe;'), '1');
    backrest('check');
    backrest('--type=full', 'backup');
    sql('INSERT INTO backup_probe VALUES (2);');
    backrest('--type=diff', 'backup');
    sql('INSERT INTO backup_probe VALUES (3);');
    sql("SELECT pg_create_restore_point('stageby_probe');");
    sql('SELECT pg_switch_wal();');
    backrest('check');
    const info = JSON.parse(backrest('--output=json', 'info').stdout)[0];
    assert.deepEqual(
      info.backup.map((backup) => backup.type),
      ['full', 'diff'],
    );
    assert.equal(info.cipher, 'aes-256-cbc');
    console.log('Full, differential, encrypted S3 repository and WAL: passed');

    // Неверный ключ проверяется до восстановления, чтобы исключить незашифрованный repository.
    const wrongKey = docker(
      [
        'compose',
        '-p',
        id,
        '-f',
        join(directory, 'compose.json'),
        'exec',
        '-T',
        '--user',
        'postgres',
        'postgres',
        'pgbackrest',
        '--stanza=stageby',
        '--repo1-cipher-pass=incorrect',
        'info',
      ],
      true,
    );
    assert.notEqual(wrongKey.status, 0, 'Repository must reject an incorrect encryption key');
    compose(
      'run',
      '--rm',
      '--no-deps',
      '--user',
      'root',
      'restored',
      'install',
      '-d',
      '-o',
      'postgres',
      '-g',
      'postgres',
      '-m',
      '0700',
      '/var/lib/postgresql/18/docker',
    );
    compose(
      'run',
      '--rm',
      '--no-deps',
      '--user',
      'postgres',
      'restored',
      'pgbackrest',
      '--stanza=stageby',
      '--type=name',
      '--target=stageby_probe',
      '--target-action=promote',
      'restore',
    );
    compose('up', '-d', '--wait', '--wait-timeout', '90', 'restored');
    let recovered = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (sql('SELECT NOT pg_is_in_recovery();', 'restored') === 't') {
        recovered = true;
        break;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
    }
    assert.ok(recovered, 'Recovery must reach its target and promote');
    assert.equal(sql('SELECT string_agg(id::text, chr(44) ORDER BY id) FROM backup_probe;', 'restored'), '1,2,3');
    console.log('Restore into a new volume through WAL to a named recovery point: passed');
  } finally {
    // Удаляются только ресурсы уникального тестового проекта; рабочие тома не используются.
    compose('down', '--volumes', '--remove-orphans');
    if (dirname(resolve(directory)) !== temporaryRoot || basename(directory) !== id) {
      throw new Error('Unexpected backup check directory');
    }
    rmSync(directory, { recursive: true, force: true });
  }
});
