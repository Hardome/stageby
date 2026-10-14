import { readSessionDraft, writeSessionDraft } from './session-drafts';
import { reconcileSessionOwner, sessionOwner, setSessionOwner } from './session-owner';

describe('session draft owner', () => {
  beforeEach(() => sessionStorage.clear());

  it('retains drafts only when the same user returns', () => {
    setSessionOwner(1);
    writeSessionDraft('form:1', { title: 'Черновик' });

    reconcileSessionOwner(1);

    expect(readSessionDraft('form:1')).toEqual({ title: 'Черновик' });

    reconcileSessionOwner(2);

    expect(readSessionDraft('form:1')).toBeUndefined();
    expect(sessionOwner()).toBe(2);
  });

  it('discards drafts when their owner cannot be verified', () => {
    writeSessionDraft('form:1', { title: 'Черновик' });

    reconcileSessionOwner(1);

    expect(readSessionDraft('form:1')).toBeUndefined();
  });
});
