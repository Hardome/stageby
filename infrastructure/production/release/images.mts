import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CommandRunner } from './command.mts';

interface ImageInspection {
  Id: string;
  Os: string;
  Architecture: string;
  Size: number;
  Config: { Labels: Record<string, string> | null };
}

export function prepareImages(source: string, id: string, sha: string, run: CommandRunner) {
  const options = { cwd: source };
  const compose = readFileSync(join(source, 'infrastructure/production/runtime/compose.yaml'), 'utf8');
  const postgres = compose.match(/image:\s*\$\{POSTGRES_IMAGE:-(postgres:[^}]+)\}/)?.[1];
  if (!postgres || !/@sha256:[a-f0-9]{64}$/.test(postgres))
    throw new Error('PostgreSQL image must be pinned by digest');

  const environment = {
    ...process.env,
    RELEASE_ID: id,
    POSTGRES_IMAGE: postgres,
    STAGEBY_CHECK_IMAGE: `stageby-check:${id}`,
  };
  const execute = (script: string, args: string[] = []) =>
    run(process.execPath, [join(source, 'scripts', script), ...args], { ...options, env: environment, inherit: true });

  execute('production.mjs', ['check']);
  execute('production.mjs', ['build', id, sha]);
  execute('production-smoke.mjs');

  run('docker', ['pull', '--platform', 'linux/amd64', postgres], { ...options, inherit: true });
  run('docker', ['tag', postgres, `stageby-postgres:${id}`], options);
  const references = ['api', 'migrator', 'web', 'postgres'].map((target) => `stageby-${target}:${id}`);
  const inspections = JSON.parse(run('docker', ['image', 'inspect', ...references], options)) as ImageInspection[];
  if (inspections.length !== references.length) throw new Error('Incomplete image inspection');

  const images = inspections.map((image, index) => {
    if (image.Os !== 'linux' || image.Architecture !== 'amd64')
      throw new Error('Release images must target linux/amd64');
    if (index < 3 && image.Config.Labels?.['org.opencontainers.image.revision'] !== sha) {
      throw new Error('Application image revision does not match the release');
    }

    return {
      reference: references[index]!,
      id: image.Id,
      dockerReportedBytes: image.Size,
      ...(index === 3 ? { source: postgres } : {}),
    };
  });

  const expectedSchema = JSON.parse(
    run(process.execPath, ['infrastructure/production/build/schema-manifest.mjs'], options),
  );
  for (const target of ['api', 'migrator']) {
    const schema = JSON.parse(
      run(
        'docker',
        [
          'run',
          '--rm',
          '--network',
          'none',
          '--read-only',
          '--entrypoint',
          'node',
          `stageby-${target}:${id}`,
          '-e',
          "process.stdout.write(require('node:fs').readFileSync('schema-manifest.json'))",
        ],
        options,
      ),
    );
    if (JSON.stringify(schema) !== JSON.stringify(expectedSchema))
      throw new Error(`${target} schema manifest mismatch`);
  }

  const dockerfile = readFileSync(join(source, 'infrastructure/production/build/Dockerfile'), 'utf8');
  const tools = {
    node: run(
      'docker',
      ['run', '--rm', '--network', 'none', '--entrypoint', 'node', references[0]!, '--version'],
      options,
    ),
    pnpm: run(
      'docker',
      ['run', '--rm', '--network', 'none', '--entrypoint', 'pnpm', `stageby-check:${id}`, '--version'],
      options,
    ),
    docker: run('docker', ['version', '--format', '{{.Client.Version}}/{{.Server.Version}}'], options),
    compose: run('docker', ['compose', 'version', '--short'], options),
    baseImages: [...new Set([...dockerfile.matchAll(/^FROM (\S+@sha256:[a-f0-9]{64})/gm)].map((match) => match[1]!))],
  };

  return { images, schema: expectedSchema, tools };
}
