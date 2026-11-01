import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const runtimeFiles = [
  'compose.yaml',
  'backup.compose.yaml',
  'Caddyfile',
  'env/api.env.example',
  'env/database.env.example',
  'env/migrator.env.example',
];

export async function sha256(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);

  return hash.digest('hex');
}

export async function copyRuntime(source: string, bundle: string, id: string): Promise<void> {
  await mkdir(join(bundle, 'runtime/env'), { recursive: true });
  for (const file of runtimeFiles) {
    await copyFile(join(source, 'infrastructure/production/runtime', file), join(bundle, 'runtime', file));
  }

  await writeFile(join(bundle, 'release.env'), `RELEASE_ID=${id}\nPOSTGRES_IMAGE=stageby-postgres:${id}\n`);
}

export async function artifactList(
  directory: string,
  prefix = '',
): Promise<{ path: string; bytes: number; sha256: string }[]> {
  const artifacts = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) artifacts.push(...(await artifactList(directory, `${path}/`)));
    else if (entry.isFile()) {
      artifacts.push({
        path,
        bytes: (await stat(join(directory, path))).size,
        sha256: await sha256(join(directory, path)),
      });
    } else throw new Error(`Unexpected artifact type: ${path}`);
  }

  return artifacts.sort((left, right) => left.path.localeCompare(right.path, 'en'));
}

export async function writeChecksums(
  directory: string,
  payload: Awaited<ReturnType<typeof artifactList>>,
): Promise<void> {
  const artifacts = [
    ...payload,
    { path: 'manifest.json', sha256: await sha256(join(directory, 'manifest.json')) },
  ].sort((left, right) => left.path.localeCompare(right.path, 'en'));
  await writeFile(join(directory, 'SHA256SUMS'), artifacts.map((file) => `${file.sha256}  ${file.path}\n`).join(''));
}
