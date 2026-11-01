import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const dockerfilePath = 'infrastructure/production/build/Dockerfile';
const checkComposePath = 'infrastructure/production/checks/compose.yaml';
const imageTargets = ['api', 'migrator', 'web', 'postgres'];

function runDocker(args) {
  const result = spawnSync('docker', args, {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Docker exited with code ${result.status}`);
  }
}

switch (process.argv[2]) {
  case 'build': {
    const releaseId = process.argv[3] ?? 'local';
    const revision = process.argv[4];
    if (!/^[\w][\w.-]{0,127}$/.test(releaseId)) throw new Error('Invalid release image tag');
    if (revision && !/^[a-f0-9]{40}$/.test(revision)) throw new Error('Invalid Git SHA');

    // Все образы собираются под архитектуру VPS, независимо от компьютера разработчика.
    for (const target of imageTargets) {
      runDocker([
        'build',
        '--load',
        '--platform',
        'linux/amd64',
        '--file',
        target === 'postgres' ? 'infrastructure/production/build/postgres.Dockerfile' : dockerfilePath,
        ...(target === 'postgres' ? [] : ['--target', target]),
        '--tag',
        `stageby-${target}:${releaseId}`,
        ...(revision ? ['--label', `org.opencontainers.image.revision=${revision}`] : []),
        '.',
      ]);
    }

    const imageNames = imageTargets.map((target) => `stageby-${target}:${releaseId}`);
    runDocker([
      'image',
      'inspect',
      ...imageNames,
      '--format',
      '{{index .RepoTags 0}} {{.Architecture}} {{.Size}} bytes',
    ]);
    break;
  }
  case 'check': {
    // Уникальное имя изолирует тестовые БД и MinIO от окружения разработки.
    const composeArgs = ['compose', '--project-name', `stageby-check-${Date.now()}`, '--file', checkComposePath];

    try {
      runDocker([...composeArgs, 'build']);
      runDocker([...composeArgs, 'up', '--abort-on-container-exit', '--exit-code-from', 'check', 'check']);
    } finally {
      // Тестовые данные удаляются и при неудачном прогоне; рабочие тома сюда не входят.
      runDocker([...composeArgs, 'down', '--volumes', '--remove-orphans']);
    }
    break;
  }
  default:
    throw new Error('Usage: node scripts/production.mjs build [release-id] [git-sha]|check');
}
