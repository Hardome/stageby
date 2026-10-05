import type { User } from '@api/types';

import { editFormSchema, passwordFormSchema, userCreationFormSchema } from '../lib/schemas';
import { getUserChanges, shouldRevokeOwnSession } from '../lib/user-form';
import { getUsersQuery, parseUsersSearch } from '../lib/user-search';

const user: User = {
  id: 1,
  login: 'manager',
  fullName: 'Имя',
  role: 'manager',
  isActive: true,
  phone: '+7',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  passwordResetRequestedAt: null,
};
const creation = {
  login: 'new.user',
  fullName: ' Имя ',
  role: 'foreman',
  phone: ' ',
  password: ' password ',
  confirmPassword: ' password ',
};

describe('user forms', () => {
  it('normalizes contacts but preserves password whitespace', () => {
    expect(userCreationFormSchema.parse(creation)).toMatchObject({
      fullName: 'Имя',
      phone: null,
      password: ' password ',
    });
  });

  it('requires a role, valid login and matching password', () => {
    expect(userCreationFormSchema.safeParse({ ...creation, role: undefined }).success).toBe(false);
    expect(userCreationFormSchema.safeParse({ ...creation, role: 'unsupported' }).success).toBe(false);
    expect(userCreationFormSchema.safeParse({ ...creation, login: 'UPPER' }).success).toBe(false);
    expect(userCreationFormSchema.safeParse({ ...creation, fullName: ' ' }).success).toBe(false);
    expect(userCreationFormSchema.safeParse({ ...creation, confirmPassword: 'different' }).success).toBe(false);
    expect(passwordFormSchema.safeParse({ password: 'short', confirmPassword: 'short' }).success).toBe(false);
    expect(passwordFormSchema.safeParse({ password: '12345678', confirmPassword: '12345678' }).success).toBe(true);
  });

  it('sends only actual changes and clears phone with null', () => {
    const values = { fullName: user.fullName, role: user.role, phone: user.phone, isActive: user.isActive };
    expect(getUserChanges(user, editFormSchema.parse(values))).toEqual({});
    expect(getUserChanges(user, editFormSchema.parse({ ...values, phone: ' ' }))).toEqual({ phone: null });
    expect(getUserChanges(user, editFormSchema.parse({ ...values, role: 'foreman', isActive: false }))).toEqual({
      role: 'foreman',
      isActive: false,
    });
  });

  it('ends only the affected own session', () => {
    expect(shouldRevokeOwnSession(1, user, { role: 'foreman' })).toBe(true);
    expect(shouldRevokeOwnSession(1, user, { isActive: false })).toBe(true);
    expect(shouldRevokeOwnSession(1, user, { fullName: 'Другое имя' })).toBe(false);
    expect(shouldRevokeOwnSession(2, user, { isActive: false })).toBe(false);
  });
});

describe('user search', () => {
  it('preserves the inactive filter and omits empty search', () => {
    expect(getUsersQuery(parseUsersSearch({ isActive: false, search: ' ', offset: 20, role: 'foreman' }))).toEqual({
      limit: 20,
      offset: 20,
      isActive: false,
      role: 'foreman',
      search: undefined,
    });
  });

  it('uses safe defaults for invalid URL values', () => {
    expect(getUsersQuery(parseUsersSearch({ offset: -1, role: 'unknown', isActive: 'false' }))).toEqual({
      limit: 20,
      offset: 0,
      search: undefined,
      role: undefined,
      isActive: undefined,
    });
  });
});
