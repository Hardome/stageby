import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { type CommandRunner, runCommand } from '../../infrastructure/production/release/command.mts';

export function createReleaseFixture() {
  const root = mkdtempSync(join(tmpdir(), 'stageby-release-test-'));
  const git = (...args: string[]) => runCommand('git', args, { cwd: root });
  git('init', '--initial-branch', 'fixture');
  git('config', 'user.name', 'Release test');
  git('config', 'user.email', 'release@example.invalid');
  writeFileSync(join(root, '.gitignore'), '.env\nignored-material/\n');
  writeFileSync(join(root, 'source.txt'), 'Committed source\n');
  mkdirSync(join(root, 'infrastructure/production/runtime/env'), { recursive: true });
  mkdirSync(join(root, 'infrastructure/production/build'), { recursive: true });
  mkdirSync(join(root, 'scripts'));
  const digest = 'a'.repeat(64);
  writeFileSync(
    join(root, 'infrastructure/production/runtime/compose.yaml'),
    `services:\n  postgres:\n    image: \${POSTGRES_IMAGE:-postgres:18@sha256:${digest}}\n`,
  );
  writeFileSync(join(root, 'infrastructure/production/runtime/Caddyfile'), 'localhost\n');
  for (const name of ['api', 'database', 'migrator']) {
    writeFileSync(join(root, `infrastructure/production/runtime/env/${name}.env.example`), 'EXAMPLE=placeholder\n');
  }
  writeFileSync(
    join(root, 'infrastructure/production/build/Dockerfile'),
    `FROM node:24@sha256:${digest} AS tooling\nFROM caddy:2@sha256:${digest}\n`,
  );
  git('add', '.gitignore', 'source.txt', 'infrastructure');
  git('commit', '-m', 'Release fixture');
  git('branch', 'main');
  git('remote', 'add', 'origin', 'https://github.com/example/stageby.git');
  const sha = git('rev-parse', 'HEAD');
  writeFileSync(join(root, '.env'), 'PRIVATE=local-secret\n');
  const pr = {
    number: 77,
    html_url: 'https://github.com/example/stageby/pull/77',
    state: 'closed',
    merged_at: '2026-10-31T00:00:00Z' as string | null,
    merge_commit_sha: sha,
    base: { ref: 'main', repo: { full_name: 'example/stageby' } },
  };
  const calls: { command: string; args: string[] }[] = [];
  const run: CommandRunner = (command, args, options) => {
    calls.push({ command, args });
    if (command === 'gh') {
      return JSON.stringify(args[1]?.includes('/commits/') ? [[pr]] : { default_branch: 'main' });
    }
    if (command === 'git' && args[0] === 'fetch') return '';
    if (command === 'git' && args[0] === 'rev-parse' && args[1] === 'FETCH_HEAD') return sha;

    return runCommand(command, args, options);
  };

  function cleanup() {
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !root.split(/[\\/]/).at(-1)?.startsWith('stageby-release-test-')
    ) {
      throw new Error('Unexpected release fixture path');
    }
    rmSync(root, { recursive: true, force: true });
  }

  return { root, git, sha, pr, calls, run, cleanup };
}
