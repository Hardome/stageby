import { describe, expect, it } from 'vitest';

import { formatDisplayName } from './format-user-name';

describe('formatDisplayName', () => {
  it.each([
    ['Петров Иван Иванович', 'Петров И. И.', 'ИП'],
    ['Петров Иван', 'Петров И.', 'ИП'],
    ['Петров', 'Петров', 'П'],
    ['  Петров  Иван   Иванович  ', 'Петров И. И.', 'ИП'],
    ['', '', ''],
    [' '.repeat(3), '', ''],
  ])('formats %s', (fullName, label, initials) => {
    expect(formatDisplayName(fullName)).toEqual({ label, initials });
  });
});
