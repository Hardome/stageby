import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const useShell = process.platform === 'win32';

function checkDocker() {
  const versionResult = spawnSync('docker', ['--version'], {
    cwd: rootDirectory,
    stdio: 'ignore',
    shell: useShell,
  });

  if (versionResult.error || versionResult.status !== 0) {
    console.error('Docker CLI is not available. Install Docker and add it to PATH.');
    process.exit(1);
  }

  const infoResult = spawnSync('docker', ['info'], {
    cwd: rootDirectory,
    stdio: 'ignore',
    shell: useShell,
  });

  if (infoResult.error || infoResult.status !== 0) {
    console.error('Docker Engine is not running. Start Docker and run the command again.');
    process.exit(1);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDirectory,
    stdio: 'inherit',
    shell: useShell,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function createEnvironment(directory) {
  const examplePath = join(rootDirectory, directory, '.env.example');
  const environmentPath = join(rootDirectory, directory, '.env');

  if (!existsSync(examplePath)) {
    return;
  }

  if (existsSync(environmentPath)) {
    console.log(`${directory}/.env already exists, keeping it unchanged.`);
    return;
  }

  copyFileSync(examplePath, environmentPath);
  console.log(`Created ${directory}/.env from ${directory}/.env.example.`);
}

checkDocker();

for (const directory of ['api', 'web']) {
  createEnvironment(directory);
}

run('pnpm', ['--dir', 'api', 'install', '--frozen-lockfile']);
run('docker', ['compose', 'up', '-d', '--wait', 'postgres']);
run('pnpm', ['--dir', 'api', 'run', 'db:migrate']);

console.log('Stageby development environment is ready.');
