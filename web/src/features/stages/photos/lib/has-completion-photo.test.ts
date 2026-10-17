import { describe, expect, it } from 'vitest';

import type { ChecklistItem, ChecklistItemPhoto, Stage } from '@api/types';

import { hasCompletionPhoto } from './has-completion-photo';

const decidedAt = '2026-10-17T05:00:00Z';
const stage = { latestAcceptance: { decision: 'rejected', decidedAt } } as Stage;
const item = { requiresRework: true } as ChecklistItem;
const photo = (uploadedAt: string) => ({ uploadedAt }) as ChecklistItemPhoto;

describe('Фото для явного выполнения пункта', () => {
  it('требует хотя бы одно сохранённое фото для первого выполнения', () => {
    const firstCompletion = { requiresRework: false } as ChecklistItem;

    expect(hasCompletionPhoto(stage, firstCompletion, [])).toBe(false);
    expect(hasCompletionPhoto(stage, firstCompletion, [photo(decidedAt)])).toBe(true);
  });

  it('не позволяет закрыть доработку со старыми фото или фото в момент возврата', () => {
    expect(hasCompletionPhoto(stage, item, [photo('2026-10-17T04:59:59Z'), photo(decidedAt)])).toBe(false);
  });

  it('разрешает выполнение с фото после возврата независимо от часового пояса', () => {
    expect(hasCompletionPhoto(stage, item, [photo('2026-10-17T10:00:01+05:00')])).toBe(true);
  });

  it('не разрешает доработку без сведений о возврате', () => {
    expect(hasCompletionPhoto({ latestAcceptance: null } as Stage, item, [photo(decidedAt)])).toBe(false);
  });
});
