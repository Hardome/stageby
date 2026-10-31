// cspell:ignore unstub
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildRelease } from '../../infrastructure/production/release/build.mts';
import { sha256 } from '../../infrastructure/production/release/bundle.mts';
import { buildFixture, type Failure } from './release-build-fixture.ts';

describe('release build', () => {
  const fixtures: ReturnType<typeof buildFixture>[] = [];
  const fixture = (failure?: Failure) => {
    const current = buildFixture(failure);
    fixtures.push(current);

    return current;
  };

  afterEach(() => {
    for (const current of fixtures.splice(0)) current.cleanup();
    vi.unstubAllEnvs();
  });

  it('packages only the verified Git snapshot after checks, build and smoke succeed', async () => {
    vi.stubEnv('POSTGRES_IMAGE', 'postgres:untrusted');
    const current = fixture();
    const output = join(current.root, 'ignored-material/releases');
    const release = await buildRelease(current.root, output, current.run);
    const manifest = JSON.parse(readFileSync(join(release.directory, 'manifest.json'), 'utf8'));

    expect(current.stages).toEqual(['check', 'build', 'smoke']);
    expect(current.state().environments).toEqual(
      Array.from({ length: 3 }, () => ({
        releaseId: manifest.id,
        checkImage: `stageby-check:${manifest.id}`,
        postgresImage: `postgres:18@sha256:${'a'.repeat(64)}`,
      })),
    );
    expect(current.state().snapshots).toEqual(
      Array.from({ length: 3 }, () => ({
        content: 'Committed source\n',
        localEnv: false,
        gitDirectory: false,
      })),
    );
    expect(manifest.source.sha).toBe(current.sha);
    expect(manifest.source.pullRequest.number).toBe(77);
    expect(manifest.schema).toEqual(current.schema);
    expect(manifest.images).toHaveLength(4);
    expect(manifest.images[3].source).toContain('postgres:18@sha256:');
    expect(gunzipSync(readFileSync(join(release.directory, 'images.tar.gz'))).toString()).toBe(
      'Fixture image archive\n',
    );
    expect(manifest.artifacts.some((file: { path: string }) => file.path === 'images.tar.gz')).toBe(true);
    expect(readFileSync(join(release.directory, 'release.env'), 'utf8')).toContain(`RELEASE_ID=${manifest.id}`);
    for (const line of readFileSync(join(release.directory, 'SHA256SUMS'), 'utf8').trim().split('\n')) {
      const [digest, path] = line.split('  ');
      expect(await sha256(join(release.directory, path!))).toBe(digest);
    }
    expect(existsSync(current.state().snapshot)).toBe(false);
    expect(existsSync(join(current.root, '.env'))).toBe(true);
  });

  it.each<Failure>(['check', 'build', 'smoke', 'platform', 'revision', 'schema', 'save'])(
    'publishes no bundle after failure at %s',
    async (failure) => {
      const current = fixture(failure);
      const output = join(current.root, 'ignored-material/releases');
      const messages: Record<Failure, string> = {
        check: 'Fixture check failed',
        build: 'Fixture build failed',
        smoke: 'Fixture smoke failed',
        platform: 'must target linux/amd64',
        revision: 'revision does not match',
        schema: 'schema manifest mismatch',
        save: 'Fixture save failed',
      };

      await expect(buildRelease(current.root, output, current.run)).rejects.toThrow(messages[failure]);

      expect(existsSync(output) ? readdirSync(output) : []).toEqual([]);
      expect(existsSync(current.state().snapshot)).toBe(false);
      expect(current.state().saved).toBe(failure === 'save');
    },
  );
});
