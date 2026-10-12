export interface UploadItem {
  id: string;
  file: File;
  status: 'uploading' | 'failed' | 'uploaded';
  error?: string;
}
