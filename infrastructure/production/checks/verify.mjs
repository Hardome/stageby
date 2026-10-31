import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

const excludedDirectories = new Set(['node_modules', 'dist', 'coverage', '.git', '.cache']);
const generatedPaths = new Set(['./api/src/generated', './web/src/generated', './contracts/openapi.yaml']);
const textFilePattern = /\.(?:[cm]?[jt]sx?|json|ya?ml|md|css|html|svg|txt)$/;

async function hashFile(path) {
  const content = await readFile(path);

  const normalizedContent = textFilePattern.test(path) ? content.toString('utf8').replaceAll('\r\n', '\n') : content;

  return createHash('sha256').update(normalizedContent).digest('hex');
}

async function collectSourceHashes(directory = '.') {
  const hashes = new Map();
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;

    if (excludedDirectories.has(entry.name) || generatedPaths.has(path) || entry.name.endsWith('.tsbuildinfo')) {
      continue;
    }

    if (entry.isDirectory()) {
      const nestedHashes = await collectSourceHashes(path);

      for (const [nestedPath, hash] of nestedHashes) {
        hashes.set(nestedPath, hash);
      }
    } else if (entry.isFile()) {
      hashes.set(path, await hashFile(path));
    }
  }

  return hashes;
}

// Generated-файлы пересоздаются из контракта перед проверками и не сравниваются.
// Для рукописных исходников сохраняется контроль неожиданных исправлений линтеров.
const hashesBefore = await collectSourceHashes();
let checkResult = spawnSync('pnpm', ['run', 'codegen'], { stdio: 'inherit' });

if (checkResult.status === 0) {
  checkResult = spawnSync('pnpm', ['run', 'check'], { stdio: 'inherit' });
}

const hashesAfter = await collectSourceHashes();
const allPaths = new Set([...hashesBefore.keys(), ...hashesAfter.keys()]);
const changedPaths = [...allPaths].filter((path) => hashesBefore.get(path) !== hashesAfter.get(path));

if (changedPaths.length > 0) {
  console.error(`Checks modified source files:\n${changedPaths.join('\n')}`);
}

process.exitCode = checkResult.status === 0 && changedPaths.length === 0 ? 0 : 1;
