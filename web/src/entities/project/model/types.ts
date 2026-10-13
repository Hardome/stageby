import type { z } from 'zod';

import type { UploadItem } from '@shared/lib/file-upload';

import type { FileUpload } from '@api/types';

import type { projectFormSchema } from '../lib/project-form-schema';

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export interface DocumentUpload extends UploadItem {
  key: string;
  checksum?: string;
  session?: FileUpload;
  fileId?: number;
}
