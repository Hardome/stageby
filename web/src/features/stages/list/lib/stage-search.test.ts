import { getStagesQuery, myStagesSearchSchema } from './stage-search';

describe('my stages search', () => {
  it('sets pagination without filtering accessible stages', () => {
    expect(getStagesQuery({})).toEqual({ limit: 20, offset: 0 });
    expect(getStagesQuery({ offset: 40 })).toEqual({ limit: 20, offset: 40 });
  });

  it.each([-1, 0.5, '20', null, Infinity, 2147483648])('normalizes invalid offset %s', (offset) => {
    expect(myStagesSearchSchema.parse({ offset })).toEqual({ offset: 0 });
  });

  it('accepts existing offsets and discards unrelated filters', () => {
    expect(myStagesSearchSchema.parse({ offset: 20, status: 'paid' })).toEqual({ offset: 20 });
  });
});
