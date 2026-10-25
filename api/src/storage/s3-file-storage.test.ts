import { createHash, randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { S3FileStorage } from '#app/storage/s3-file-storage';

describe('S3FileStorage with MinIO', () => {
  it('загружает, проверяет, скачивает и удаляет объект через подписанные URL', { timeout: 30_000 }, async () => {
    const environment = parseEnvironment({
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL,
      CORS_ORIGIN: 'http://localhost:5173',
      S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://127.0.0.1:9000',
      S3_REGION: process.env.S3_REGION ?? 'us-east-1',
      S3_BUCKET: process.env.S3_BUCKET ?? 'stageby',
      S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID ?? 'stageby',
      S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY ?? 'stageby-development',
    });
    const storage = new S3FileStorage(environment);
    const key = `tests/storage/${randomUUID()}`;
    const body = Buffer.from('stageby-minio-integration');
    const checksumHex = createHash('md5').update(body).digest('hex');
    const checksumBase64 = Buffer.from(checksumHex, 'hex').toString('base64');

    await storage.ensureBucket();
    try {
      const upload = await storage.createUploadRequest({
        key,
        mimeType: 'image/jpeg',
        sizeBytes: body.byteLength,
        checksumMd5Base64: checksumBase64,
        expiresInSeconds: 60,
      });
      const signedUrl = new URL(upload.url);
      expect(signedUrl.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toContain('content-md5');
      expect([...signedUrl.searchParams.keys()].some((name) => name.startsWith('x-amz-checksum-'))).toBe(false);
      expect(upload.headers['content-md5']).toBe(checksumBase64);

      const origin = process.env.MINIO_API_CORS_ALLOW_ORIGIN?.split(',')[0] ?? 'http://localhost:3000';
      const preflight = await fetch(upload.url, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'PUT',
          'Access-Control-Request-Headers': 'content-type,content-md5',
        },
      });
      expect(preflight.ok).toBe(true);
      expect(preflight.headers.get('access-control-allow-origin')).toBe(origin);
      expect(preflight.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('content-md5');

      const foreign = await fetch(upload.url, {
        method: 'OPTIONS',
        headers: { Origin: 'https://foreign.invalid', 'Access-Control-Request-Method': 'PUT' },
      });
      expect(foreign.headers.get('access-control-allow-origin')).toBeNull();

      const corruptBody = Buffer.from(body);
      corruptBody[0] = corruptBody[0]! ^ 1;
      const corrupt = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: corruptBody });
      expect(corrupt.status).toBe(400);
      expect(await corrupt.text()).toContain('BadDigest');
      expect(await storage.getMetadata(key)).toBeNull();

      const { 'content-md5': omittedChecksum, ...unsignedHeaders } = upload.headers;
      expect(omittedChecksum).toBe(checksumBase64);
      const missing = await fetch(upload.url, { method: 'PUT', headers: unsignedHeaders, body });
      expect(missing.ok).toBe(false);

      const replaced = await fetch(upload.url, {
        method: 'PUT',
        headers: { ...upload.headers, 'content-md5': Buffer.alloc(16).toString('base64') },
        body,
      });
      expect(replaced.ok).toBe(false);

      const uploadResponse = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body });
      expect(uploadResponse.status, await uploadResponse.text()).toBe(200);

      const metadata = await storage.getMetadata(key);
      expect(metadata).toEqual({
        sizeBytes: body.byteLength,
        mimeType: 'image/jpeg',
        checksumMd5Hex: checksumHex,
      });

      const download = await storage.createDownloadRequest({ key, originalName: 'photo.jpg', expiresInSeconds: 60 });
      const downloadResponse = await fetch(download.url);
      expect(downloadResponse.status).toBe(200);
      expect(downloadResponse.headers.get('content-disposition')).toBe("inline; filename*=UTF-8''photo.jpg");
      expect(Buffer.from(await downloadResponse.arrayBuffer())).toEqual(body);
    } finally {
      await storage.delete(key);
    }
    expect(await storage.getMetadata(key)).toBeNull();
  });
});
