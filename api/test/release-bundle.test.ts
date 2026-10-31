import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { artifactList, copyRuntime, sha256, writeChecksums } from '../../infrastructure/production/release/bundle.mts';
import { createReleaseFixture } from './release-fixture.ts';

describe('release artifacts', () => {
  let current: ReturnType<typeof createReleaseFixture> | undefined;

  afterEach(() => current?.cleanup());

  it('copies only public runtime configuration and release image references', async () => {
    current = createReleaseFixture();
    writeFileSync(join(current.root, 'infrastructure/production/runtime/env/api.env'), 'SECRET=private\n');
    const output = join(current.root, 'ignored-material/bundle');

    await copyRuntime(current.root, output, 'release-test');
    const files = await artifactList(output);

    expect(files.map((file) => file.path)).toEqual([
      'release.env',
      'runtime/Caddyfile',
      'runtime/compose.yaml',
      'runtime/env/api.env.example',
      'runtime/env/database.env.example',
      'runtime/env/migrator.env.example',
    ]);
    expect(readFileSync(join(output, 'release.env'), 'utf8')).toContain('POSTGRES_IMAGE=stageby-postgres:release-test');
    expect(files.every((file) => !readFileSync(join(output, file.path), 'utf8').includes('private'))).toBe(true);
  });

  it('covers the manifest and binary payload with SHA-256 and detects corruption', async () => {
    current = createReleaseFixture();
    const output = join(current.root, 'ignored-material/checksums');
    mkdirSync(output, { recursive: true });
    const payload = Buffer.from([0, 255, 1, 128, 10, 13]);
    writeFileSync(join(output, 'images.tar.gz'), payload);
    writeFileSync(join(output, 'manifest.json'), '{"id":"test"}\n');

    await writeChecksums(output);
    const checksums = readFileSync(join(output, 'SHA256SUMS'), 'utf8');
    const digest = createHash('sha256').update(payload).digest('hex');

    expect(checksums).toContain(`${digest}  images.tar.gz\n`);
    expect(checksums).toContain('  manifest.json\n');
    expect(checksums).not.toContain('  SHA256SUMS');

    writeFileSync(join(output, 'images.tar.gz'), Buffer.from([1, 2, 3]));

    expect(await sha256(join(output, 'images.tar.gz'))).not.toBe(digest);
  });
});
