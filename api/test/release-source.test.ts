import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { githubRepository, verifyReleaseSource } from '../../infrastructure/production/release/source.mts';
import { createReleaseFixture } from './release-fixture.ts';

describe('release provenance', () => {
  const fixtures: ReturnType<typeof createReleaseFixture>[] = [];
  const fixture = () => {
    const result = createReleaseFixture();
    fixtures.push(result);

    return result;
  };

  afterEach(() => {
    for (const current of fixtures.splice(0)) current.cleanup();
  });

  it.each(['unstaged', 'staged', 'untracked'])('rejects %s changes before network access', (state) => {
    const current = fixture();
    writeFileSync(join(current.root, state === 'untracked' ? 'new.txt' : 'source.txt'), 'Changed\n');
    if (state === 'staged') current.git('add', 'source.txt');

    expect(() => verifyReleaseSource(current.root, current.run)).toThrow('clean Git state');
    expect(current.calls.every((call) => call.command === 'git' && call.args[0] === 'status')).toBe(true);
  });

  it('accepts the final commit of a merged PR and ignores local secrets', () => {
    const current = fixture();
    const source = verifyReleaseSource(current.root, current.run);

    expect(source.sha).toBe(current.sha);
    expect(source.mainSha).toBe(current.sha);
    expect(source.pullRequest.number).toBe(77);
  });

  it('rejects a clean commit outside main', () => {
    const current = fixture();
    writeFileSync(join(current.root, 'source.txt'), 'New branch commit\n');
    current.git('add', 'source.txt');
    current.git('commit', '-m', 'Unmerged fixture');

    expect(() => verifyReleaseSource(current.root, current.run)).toThrow('not part of origin/main');
  });

  it.each(['open', 'unmerged', 'other-sha', 'other-base', 'other-repository'])('rejects PR evidence: %s', (reason) => {
    const current = fixture();
    if (reason === 'open') current.pr.state = 'open';
    if (reason === 'unmerged') current.pr.merged_at = null;
    if (reason === 'other-sha') current.pr.merge_commit_sha = 'b'.repeat(40);
    if (reason === 'other-base') current.pr.base.ref = 'develop';
    if (reason === 'other-repository') current.pr.base.repo.full_name = 'other/stageby';

    expect(() => verifyReleaseSource(current.root, current.run)).toThrow('merge commit of a merged PR');
  });

  it('rejects changes made during provenance verification', () => {
    const current = fixture();

    expect(() =>
      verifyReleaseSource(current.root, (command, args, options) => {
        const result = current.run(command, args, options);
        if (command === 'gh' && args[1]?.includes('/commits/')) {
          writeFileSync(join(current.root, 'source.txt'), 'Concurrent edit\n');
        }

        return result;
      }),
    ).toThrow('Git state changed');
  });

  it('fails closed when GitHub is unavailable', () => {
    const current = fixture();

    expect(() =>
      verifyReleaseSource(current.root, (command, args, options) => {
        if (command === 'gh') throw new Error('GitHub unavailable');

        return current.run(command, args, options);
      }),
    ).toThrow('GitHub unavailable');
  });

  it.each([
    'https://github.com/example/stageby.git',
    'git@github.com:example/stageby.git',
    'ssh://git@github.com/example/stageby',
  ])('accepts GitHub remote %s', (remote) => {
    expect(githubRepository(remote)).toBe('example/stageby');
  });

  it.each(['https://token@github.com/example/stageby.git', 'https://other.invalid/example/stageby', '../stageby'])(
    'rejects unsafe remote %s',
    (remote) => {
      expect(() => githubRepository(remote)).toThrow('origin must reference');
    },
  );
});
