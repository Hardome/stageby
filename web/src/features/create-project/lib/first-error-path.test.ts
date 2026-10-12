import { firstErrorPath } from './first-error-path';

describe('first form error path', () => {
  it('finds a nested checklist field and ignores DOM refs', () => {
    expect(
      firstErrorPath({
        stages: [{ checklistItems: [{ title: { type: 'required', ref: document.createElement('input') } }] }],
      }),
    ).toBe('stages.0.checklistItems.0.title');
  });

  it('maps array root errors to the group field', () => {
    expect(firstErrorPath({ root: { type: 'too_small' } }, 'stages.1.checklistItems')).toBe('stages.1.checklistItems');
  });

  it('returns no path without errors', () => {
    expect(firstErrorPath({})).toBeUndefined();
  });
});
