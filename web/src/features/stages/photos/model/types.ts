import type { FileUpload } from '@api/types';

export interface PhotoUpload {
  id: string;
  file: File;
  prepared?: File;
  checksum?: string;
  session?: FileUpload;
  completionKey: string;
  transferred?: boolean;
  fileId?: number;
  attached?: boolean;
  status: 'waiting' | 'uploading' | 'failed' | 'uploaded';
  error?: string;
}

export interface PhotoQueueState {
  items: PhotoUpload[];
  loaded: boolean;
  storageFailed: boolean;
  error: string;
}
