import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { Environment } from '#app/config/env';
import type {
  FileStorage,
  SignedStorageRequest,
  SignedUploadRequest,
  StoredObjectMetadata,
} from '#app/storage/file-storage';

export class S3FileStorage implements FileStorage {
  readonly #bucket: string;
  readonly #client: S3Client;

  constructor(environment: Environment) {
    this.#bucket = environment.S3_BUCKET;
    this.#client = new S3Client({
      endpoint: environment.S3_ENDPOINT,
      region: environment.S3_REGION,
      forcePathStyle: environment.S3_FORCE_PATH_STYLE,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: environment.S3_ACCESS_KEY_ID,
        secretAccessKey: environment.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.#client.send(new HeadBucketCommand({ Bucket: this.#bucket }));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        '$metadata' in error &&
        (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404
      ) {
        await this.#client.send(new CreateBucketCommand({ Bucket: this.#bucket }));
        return;
      }
      throw error;
    }
  }

  async createUploadRequest(input: {
    key: string;
    mimeType: string;
    sizeBytes: number;
    checksumMd5Base64: string;
    expiresInSeconds: number;
  }): Promise<SignedUploadRequest> {
    const command = new PutObjectCommand({
      Bucket: this.#bucket,
      Key: input.key,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
      ContentMD5: input.checksumMd5Base64,
    });
    const url = await getSignedUrl(this.#client, command, {
      expiresIn: input.expiresInSeconds,
      signableHeaders: new Set(['content-md5', 'content-type']),
    });
    return {
      url,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
      headers: {
        'content-length': String(input.sizeBytes),
        'content-type': input.mimeType,
        'content-md5': input.checksumMd5Base64,
      },
    };
  }

  async createDownloadRequest(input: {
    key: string;
    originalName: string;
    expiresInSeconds: number;
  }): Promise<SignedStorageRequest> {
    const disposition = /\.(pdf|jpe?g|png|webp)$/i.test(input.originalName) ? 'inline' : 'attachment';
    const command = new GetObjectCommand({
      Bucket: this.#bucket,
      Key: input.key,
      ResponseContentDisposition: `${disposition}; filename*=UTF-8''${encodeURIComponent(input.originalName)}`,
    });
    return {
      url: await getSignedUrl(this.#client, command, { expiresIn: input.expiresInSeconds }),
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async getMetadata(key: string): Promise<StoredObjectMetadata | null> {
    try {
      const metadata = await this.#client.send(new HeadObjectCommand({ Bucket: this.#bucket, Key: key }));
      if (metadata.ContentLength === undefined || !metadata.ContentType) return null;
      return {
        sizeBytes: metadata.ContentLength,
        mimeType: metadata.ContentType,
        checksumMd5Hex: md5FromETag(metadata.ETag),
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        ('$metadata' in error || 'name' in error) &&
        (('name' in error && error.name === 'NotFound') ||
          ('$metadata' in error && (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404))
      ) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.#client.send(new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }));
  }
}

export function md5FromETag(etag: string | undefined): string | null {
  if (!etag) return null;
  const value = etag.replace(/^"([a-fA-F0-9]{32})"$/, '$1');

  return /^[a-fA-F0-9]{32}$/.test(value) ? value.toLowerCase() : null;
}
