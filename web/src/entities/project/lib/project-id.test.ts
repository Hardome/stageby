import { parseProjectId } from './project-id';

it.each(['0', '-1', '1.1', '1e2', '1abc', '2147483648', '9007199254740993'])('rejects invalid ID %s', (value) => {
  expect(parseProjectId(value)).toBeUndefined();
});
it('accepts IDs within the contract range', () => {
  expect(parseProjectId('1')).toBe(1);
  expect(parseProjectId('2147483647')).toBe(2147483647);
});
