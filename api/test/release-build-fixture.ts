import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { CommandOptions, CommandRunner } from '../../infrastructure/production/release/command.mts';
import { createReleaseFixture } from './release-fixture.ts';

export type Failure =
  | 'check'
  | 'build'
  | 'backup'
  | 'smoke'
  | 'platform'
  | 'revision'
  | 'postgres-revision'
  | 'schema'
  | 'save';

export function buildFixture(failure?: Failure) {
  const current = createReleaseFixture();
  const stages: string[] = [];
  const snapshots: { content: string; localEnv: boolean; gitDirectory: boolean }[] = [];
  const environments: {
    releaseId: string | undefined;
    checkImage: string | undefined;
    postgresImage: string | undefined;
  }[] = [];
  const schema = {
    compatibilityVersion: 1,
    migrations: [{ name: '0001_fixture', timestamp: 1, hash: 'a'.repeat(64) }],
  };
  let snapshot = '';
  let saved = false;

  function runNode(args: string[], options: CommandOptions) {
    if (args[0]?.endsWith('schema-manifest.mjs')) return JSON.stringify(schema);
    snapshot = options.cwd;
    if (readFileSync(join(snapshot, 'ТЗ с пробелами.md'), 'utf8') !== 'Unicode filename\n') {
      throw new Error('Git snapshot changed Unicode filename or content');
    }
    snapshots.push({
      content: readFileSync(join(snapshot, 'source.txt'), 'utf8'),
      localEnv: existsSync(join(snapshot, '.env')),
      gitDirectory: existsSync(join(snapshot, '.git')),
    });
    environments.push({
      releaseId: options.env?.RELEASE_ID,
      checkImage: options.env?.STAGEBY_CHECK_IMAGE,
      postgresImage: options.env?.POSTGRES_IMAGE,
    });
    let stage = args[1]!;
    if (args[0]?.endsWith('backrest.mjs')) stage = 'backup';
    if (args[0]?.endsWith('production-smoke.mjs')) stage = 'smoke';
    stages.push(stage);
    if (stage === failure) throw new Error(`Fixture ${stage} failed`);

    return '';
  }

  function inspectImages(references: string[]) {
    return JSON.stringify(
      references.map((reference, index) => ({
        Id: `sha256:${String(index).repeat(64)}`,
        Os: 'linux',
        Architecture: failure === 'platform' ? 'arm64' : 'amd64',
        Size: 100,
        Config: {
          Labels: {
            'org.opencontainers.image.revision':
              failure === 'revision' || (failure === 'postgres-revision' && index === 3) ? 'other' : current.sha,
          },
        },
        RepoTags: [reference],
      })),
    );
  }

  function saveImages(path: string) {
    saved = true;
    if (failure === 'save') throw new Error('Fixture save failed');
    writeFileSync(path, 'Fixture image archive\n');

    return '';
  }

  function runContainer(args: string[]) {
    if (args.includes('pgbackrest')) return 'pgBackRest 2.60.0';
    if (args.at(-1)?.includes('schema-manifest.json')) {
      return JSON.stringify(failure === 'schema' ? { ...schema, compatibilityVersion: 2 } : schema);
    }

    return args.includes('pnpm') ? '12.6.0' : 'v24.19.0';
  }

  function runDocker(args: string[]) {
    switch (args[0]) {
      case 'image':
        if (args[1] === 'inspect') return inspectImages(args.slice(2));
        if (args[1] === 'save') return saveImages(args[3]!);
        break;
      case 'run':
        return runContainer(args);
      case 'version':
        return '28.5.2/28.5.2';
      case 'compose':
        return 'v2.40.3';
      case 'pull':
      case 'tag':
      case 'build':
        return '';
    }

    throw new Error(`Unexpected fixture Docker command: ${args.join(' ')}`);
  }

  const run: CommandRunner = (command, args, options) => {
    if (command === process.execPath) return runNode(args, options);
    if (command === 'docker') return runDocker(args);

    return current.run(command, args, options);
  };

  return { ...current, run, schema, stages, state: () => ({ snapshot, snapshots, environments, saved }) };
}
