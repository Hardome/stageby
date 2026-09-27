import { z } from 'zod';

import { createUserSchema as userCreationSchema } from '@api/zod/createUserSchema';
import { setUserPasswordSchema as userPasswordSchema } from '@api/zod/setUserPasswordSchema';
import { updateUserSchema } from '@api/zod/updateUserSchema';
import { userRoleSchema } from '@api/zod/userRoleSchema';

const fullName = userCreationSchema.shape.fullName.trim().min(1, 'Введите имя.');
const phone = z
  .string()
  .trim()
  .max(32, 'Телефон — до 32 символов.')
  .transform((value) => value || null);

const password = userCreationSchema.shape.password;
const confirmPassword = z.string();
const confirmation = { message: 'Пароли не совпадают.', path: ['confirmPassword'] };

export const userCreationFormSchema = userCreationSchema
  .extend({
    fullName,
    phone,
    confirmPassword,
    role: userCreationSchema.shape.role.optional().pipe(userCreationSchema.shape.role),
  })
  .refine((value) => value.password === value.confirmPassword, confirmation);

export const editFormSchema = updateUserSchema.required().extend({ fullName, phone });

export const passwordFormSchema = userPasswordSchema
  .extend({ password, confirmPassword })
  .refine((value) => value.password === value.confirmPassword, confirmation);

export const draftSchema = z.object({
  fullName: z.string(),
  login: z.string(),
  phone: z.string(),
  role: userRoleSchema.optional(),
});

export const searchSchema = z.object({
  search: z.string().trim().max(100).catch('').optional(),
  role: userRoleSchema.optional().catch(undefined),
  isActive: z.boolean().optional().catch(undefined),
  offset: z.number().int().min(0).max(2147483647).catch(0).optional(),
});
