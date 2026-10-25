import { z } from 'zod';

import { fileUploadSchema } from '@api/zod/fileUploadSchema';

export const photoQueueSchema = z.array(
  z.object({
    id: z.uuid(),
    file: z.instanceof(File),
    prepared: z.instanceof(File).optional(),
    checksum: z
      .string()
      .regex(/^[a-f0-9]{32}$/)
      .optional(),
    session: fileUploadSchema.optional(),
    completionKey: z.uuid(),
    transferred: z.boolean().optional(),
    fileId: z.number().int().positive().optional(),
    attached: z.boolean().optional(),
    status: z.enum(['waiting', 'uploading', 'failed', 'uploaded']),
    error: z.string().optional(),
  }),
);
