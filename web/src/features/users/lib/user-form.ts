import type { UpdateUser, User } from '@api/types';

import type { EditFormOutput } from '../model/types';

export function getUserChanges(user: User, values: EditFormOutput): UpdateUser {
  const changes: UpdateUser = {};

  if (values.fullName !== user.fullName) changes.fullName = values.fullName;
  if (values.phone !== user.phone) changes.phone = values.phone;
  if (values.role !== user.role) changes.role = values.role;
  if (values.isActive !== user.isActive) changes.isActive = values.isActive;

  return changes;
}

export function shouldRevokeOwnSession(currentId: number | undefined, user: User, changes: UpdateUser): boolean {
  return (
    currentId === user.id && (changes.isActive === false || (changes.role !== undefined && changes.role !== user.role))
  );
}
