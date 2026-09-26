import { clearSessionDrafts, readSessionDraft, writeSessionDraft } from '@shared/lib';

import { clearCreateDraft, loadCreateDraft, saveCreateDraft } from '../lib/create-draft';
import { emptyDraft } from '../model/data';

describe('user creation draft', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('restores unfinished fields and excludes passwords', () => {
    const secret = ['not', 'for', 'storage'].join('-');
    saveCreateDraft(1, {
      fullName: ' ',
      login: 'a',
      phone: '+',
      password: secret,
      confirmPassword: secret,
    });
    expect(loadCreateDraft(1)).toEqual({ fullName: ' ', login: 'a', phone: '+' });
    expect(sessionStorage.getItem('stageby:draft:create-user:v1:1')).not.toContain('password');
    expect(sessionStorage.getItem('stageby:draft:create-user:v1:1')).not.toContain('not-for-storage');
  });

  it('keeps drafts separate for each manager and clears only the requested draft', () => {
    saveCreateDraft(1, { ...emptyDraft, fullName: 'Первый', role: 'manager' });
    saveCreateDraft(2, { ...emptyDraft, fullName: 'Второй', role: 'inspector' });
    expect(loadCreateDraft(1).fullName).toBe('Первый');
    expect(loadCreateDraft(2).role).toBe('inspector');
    clearCreateDraft(1);
    expect(loadCreateDraft(1)).toEqual(emptyDraft);
    expect(loadCreateDraft(2).fullName).toBe('Второй');
  });

  it('clears drafts on session reset without clearing unrelated storage', () => {
    saveCreateDraft(1, emptyDraft);
    saveCreateDraft(2, emptyDraft);
    sessionStorage.setItem('unrelated', 'value');
    clearSessionDrafts();
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem('unrelated')).toBe('value');
  });

  it('ignores corrupt or incompatible data', () => {
    sessionStorage.setItem('stageby:draft:create-user:v1:1', '{');
    expect(loadCreateDraft(1)).toEqual(emptyDraft);
    writeSessionDraft('create-user:v1:1', { ...emptyDraft, role: 'unknown' });
    expect(loadCreateDraft(1)).toEqual(emptyDraft);
    expect(readSessionDraft('missing')).toBeUndefined();
  });

  it('continues when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Unavailable');
    });
    expect(loadCreateDraft(1)).toEqual(emptyDraft);
    expect(() => saveCreateDraft(1, emptyDraft)).not.toThrow();
    expect(() => clearCreateDraft(1)).not.toThrow();
    expect(() => clearSessionDrafts()).not.toThrow();
  });
});
