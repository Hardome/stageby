import type { UserRoleKey } from '@api/types';

import type { CreateDraft, UserSuccessAction } from './types';

export const userSuccessMessages: Record<UserSuccessAction, string> = {
  created: 'Пользователь создан',
  updated: 'Изменения сохранены',
  password: 'Пароль изменён',
};

export const emptyDraft: CreateDraft = { fullName: '', login: '', phone: '' };

export const roleLabels: Record<UserRoleKey, string> = {
  manager: 'Руководитель',
  estimator: 'Инженер-сметчик',
  foreman: 'Мастер / исполнитель',
  inspector: 'Приёмщик',
};

export const roleItems = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));
