import { randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

import { artifactList, copyRuntime, writeChecksums } from './bundle.mts';
import { type CommandRunner, runCommand } from './command.mts';
import { prepareImages } from './images.mts';
import { verifyReleaseSource } from './source.mts';

export function tarExecutable(): string {
  // Системный bsdtar не зависит от MSYS и корректно работает с Windows-путями.
  return process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
}

async function removeTemporary(directory: string, parent: string, prefix: string): Promise<void> {
  if (dirname(resolve(directory)) !== resolve(parent) || !basename(directory).startsWith(prefix)) {
    throw new Error('Refusing to remove a directory outside the owned temporary path');
  }
  await rm(directory, { recursive: true, force: true });
}

export async function buildRelease(
  root: string,
  output = join(root, 'docs/tmp/releases'),
  run: CommandRunner = runCommand,
) {
  const source = verifyReleaseSource(root, run);
  const createdAt = new Date().toISOString();
  const id = `${createdAt.replaceAll(/[-:.]/g, '')}-${source.sha.slice(0, 12)}-${randomBytes(3).toString('hex')}`;
  const temporary = await mkdtemp(join(tmpdir(), 'stageby-release-'));
  const outputRoot = resolve(output);
  let staging: string | undefined;

  try {
    const snapshot = join(temporary, 'source');
    const archive = join(temporary, 'source.tar');
    await mkdir(snapshot);
    // git archive исключает незакоммиченные и игнорируемые файлы, включая локальные секреты.
    run(
      'git',
      ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', `--output=${archive}`, source.sha],
      { cwd: root },
    );
    run(tarExecutable(), ['-xf', archive, '-C', snapshot], { cwd: root });
    const { images, schema, tools } = prepareImages(snapshot, id, source.sha, run);

    await mkdir(outputRoot, { recursive: true });
    staging = await mkdtemp(join(outputRoot, `.${id}-`));
    await copyRuntime(snapshot, staging, id);
    const imageTar = join(temporary, 'images.tar');
    run('docker', ['image', 'save', '--output', imageTar, ...images.map((image) => image.reference)], {
      cwd: snapshot,
      inherit: true,
    });
    await pipeline(createReadStream(imageTar), createGzip(), createWriteStream(join(staging, 'images.tar.gz')));

    const artifacts = await artifactList(staging);
    const manifest = {
      formatVersion: 1,
      id,
      createdAt,
      source,
      platform: 'linux/amd64',
      tools: { ...tools, hostNode: process.version },
      images,
      schema,
      artifacts,
      sizes: {
        imageTarBytes: (await stat(imageTar)).size,
        payloadBytes: artifacts.reduce((sum, file) => sum + file.bytes, 0),
      },
      checks: { linux: 'passed', smoke: 'passed' },
    };
    await writeFile(join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeChecksums(staging, artifacts);

    const destination = join(outputRoot, id);
    if (existsSync(destination)) throw new Error(`Release already exists: ${id}`);
    await rename(staging, destination);
    staging = undefined;
    console.log(`Release ${id} built at ${destination}`);

    return { directory: destination, manifest };
  } finally {
    if (staging) await removeTemporary(staging, outputRoot, `.${id}-`);
    await removeTemporary(temporary, tmpdir(), 'stageby-release-');
  }
}
