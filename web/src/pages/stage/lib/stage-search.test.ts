import { stageSearchSchema } from './stage-search';

describe('stage search', () => {
  it.each(['checklist', 'materials', 'work'])('accepts the %s tab and list offset', (tab) => {
    expect(stageSearchSchema.parse({ tab, offset: 20 })).toEqual({ tab, offset: 20 });
  });

  it('defaults invalid tabs to checklist and validates offset', () => {
    expect(stageSearchSchema.parse({ tab: 'unknown', offset: -1 })).toEqual({ tab: 'checklist', offset: 0 });
    expect(stageSearchSchema.parse({})).toEqual({});
  });
});
