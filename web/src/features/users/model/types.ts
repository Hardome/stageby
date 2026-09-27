import type { z } from 'zod';

import type { ApiError } from '@api/types';

import type {
  draftSchema,
  editFormSchema,
  passwordFormSchema,
  searchSchema,
  userCreationFormSchema,
} from '../lib/schemas';

export type CreateDraft = z.infer<typeof draftSchema>;
export type CreateFormValues = z.input<typeof userCreationFormSchema>;
export type CreateFormOutput = z.output<typeof userCreationFormSchema>;
export type EditFormValues = z.input<typeof editFormSchema>;
export type EditFormOutput = z.output<typeof editFormSchema>;
export type PasswordFormValues = z.infer<typeof passwordFormSchema>;
export type UsersSearch = z.infer<typeof searchSchema>;
export type UserError = { status?: number; data?: ApiError };
export type UserSuccessAction = 'created' | 'updated' | 'password';
