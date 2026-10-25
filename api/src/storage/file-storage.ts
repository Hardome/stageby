export interface StoredObjectMetadata {
  sizeBytes: number;
  mimeType: string;
  checksumMd5Hex: string | null;
}

export interface SignedStorageRequest {
  url: string;
  expiresAt: Date;
}

export interface SignedUploadRequest extends SignedStorageRequest {
  headers: Record<string, string>;
}

export interface FileStorage {
  createUploadRequest(input: {
    key: string;
    mimeType: string;
    sizeBytes: number;
    checksumMd5Base64: string;
    expiresInSeconds: number;
  }): Promise<SignedUploadRequest>;
  createDownloadRequest(input: {
    key: string;
    originalName: string;
    expiresInSeconds: number;
  }): Promise<SignedStorageRequest>;
  getMetadata(key: string): Promise<StoredObjectMetadata | null>;
  delete(key: string): Promise<void>;
}
