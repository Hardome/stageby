import type { UserRow } from '#app/db/schema/users';
import type { User } from '#app/generated/types.gen';

export function toUser(user: Omit<UserRow, 'passwordHash'>): User {
  return {
    id: user.id,
    login: user.login,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    isActive: user.isActive,
    passwordResetRequestedAt: user.passwordResetRequestedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
