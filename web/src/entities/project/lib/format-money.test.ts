import { formatMoney } from './format-money';

it('distinguishes missing and zero plans and formats bigint without losing precision', () => {
  expect(formatMoney(null)).toBe('Не задан');
  expect(formatMoney(0n)).toBe('0 ₽');
  expect(formatMoney(180000000n).replaceAll('\u{A0}', ' ')).toBe('1 800 000 ₽');
  expect(formatMoney(900719925474099300n).replaceAll('\u{A0}', ' ')).toBe('9 007 199 254 740 993 ₽');
});
