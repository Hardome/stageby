import { z } from 'zod';

import { userRoleSchema } from '@api/zod/userRoleSchema';

export const editUserDraftSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  role: userRoleSchema,
  isActive: z.boolean(),
});
