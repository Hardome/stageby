import { readSessionDraft, removeSessionDraft, writeSessionDraft } from '@shared/lib';

import { emptyDraft } from '../model/data';
import type { CreateDraft } from '../model/types';
import { draftSchema } from './schemas';

const key = (managerId: number) => `create-user:v1:${managerId}`;

export function loadCreateDraft(managerId: number): CreateDraft {
  const result = draftSchema.safeParse(readSessionDraft(key(managerId)));

  return result.success ? result.data : { ...emptyDraft };
}

export function saveCreateDraft(managerId: number, value: unknown): void {
  const result = draftSchema.safeParse(value);

  if (result.success) writeSessionDraft(key(managerId), result.data);
}

export function clearCreateDraft(managerId: number): void {
  removeSessionDraft(key(managerId));
}
