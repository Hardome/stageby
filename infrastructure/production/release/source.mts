import { type CommandRunner, runCommand } from './command.mts';

interface PullRequest {
  number: number;
  html_url: string;
  state: string;
  merged_at: string | null;
  merge_commit_sha: string;
  base: { ref: string; repo: { full_name: string } };
}

export interface ReleaseSource {
  repository: string;
  sha: string;
  mainSha: string;
  pullRequest: { number: number; url: string; mergedAt: string };
}

export function githubRepository(remote: string): string {
  const match = remote.match(
    /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/,
  );
  if (!match?.[1]) throw new Error('origin must reference a GitHub repository without credentials in its URL');

  return match[1];
}

export function verifyReleaseSource(root: string, run: CommandRunner = runCommand): ReleaseSource {
  const options = { cwd: root };
  const git = (...args: string[]) => run('git', args, options);

  if (git('status', '--porcelain=v1', '--untracked-files=all')) {
    throw new Error('Release requires a clean Git state, including staged and untracked files');
  }

  const sha = git('rev-parse', 'HEAD');
  const repository = githubRepository(git('remote', 'get-url', 'origin'));
  const metadata = JSON.parse(run('gh', ['api', `repos/${repository}`], options)) as { default_branch: string };
  if (metadata.default_branch !== 'main') throw new Error('The GitHub default branch must be main');

  git('fetch', '--no-tags', 'origin', 'main');
  const mainSha = git('rev-parse', 'FETCH_HEAD');
  if (git('merge-base', sha, mainSha) !== sha) throw new Error('HEAD is not part of origin/main');

  const pages = JSON.parse(
    run('gh', ['api', `repos/${repository}/commits/${sha}/pulls?per_page=100`, '--paginate', '--slurp'], options),
  ) as PullRequest[][];
  const pullRequest = pages
    .flat()
    .find(
      (pr) =>
        pr.state === 'closed' &&
        pr.merged_at &&
        pr.merge_commit_sha === sha &&
        pr.base.ref === 'main' &&
        pr.base.repo.full_name.toLowerCase() === repository.toLowerCase(),
    );

  // Нужен итоговый коммит PR, а не промежуточное состояние его исходной ветки.
  if (!pullRequest?.merged_at) throw new Error('HEAD must be the merge commit of a merged PR into main');
  if (git('status', '--porcelain=v1', '--untracked-files=all') || git('rev-parse', 'HEAD') !== sha) {
    throw new Error('Git state changed while verifying release provenance');
  }

  return {
    repository,
    sha,
    mainSha,
    pullRequest: { number: pullRequest.number, url: pullRequest.html_url, mergedAt: pullRequest.merged_at },
  };
}
