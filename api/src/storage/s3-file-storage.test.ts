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
    const checksumHex = createHash('sha256').update(body).digest('hex');
    const checksumBase64 = Buffer.from(checksumHex, 'hex').toString('base64');

    await storage.ensureBucket();
    try {
      const upload = await storage.createUploadRequest({
        key,
        mimeType: 'image/jpeg',
        sizeBytes: body.byteLength,
        checksumSha256Base64: checksumBase64,
        expiresInSeconds: 60,
      });
      const uploadResponse = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body });
      expect(uploadResponse.status, await uploadResponse.text()).toBe(200);

      const metadata = await storage.getMetadata(key);
      expect(metadata).toEqual({
        sizeBytes: body.byteLength,
        mimeType: 'image/jpeg',
        checksumSha256Base64: checksumBase64,
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
