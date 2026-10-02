import { describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';

const base = { DATABASE_URL: 'postgresql://localhost/stageby', CORS_ORIGIN: 'https://app.example' };

describe('Настройки защиты', () => {
  it('по умолчанию не доверяет прокси', () => {
    expect(parseEnvironment(base).TRUST_PROXY).toEqual([]);
  });

  it('принимает явные IP и CIDR прокси', () => {
    expect(parseEnvironment({ ...base, TRUST_PROXY: '127.0.0.1, 10.0.0.0/8, ::1, 2001:db8::/32' }).TRUST_PROXY).toEqual(
      ['127.0.0.1', '10.0.0.0/8', '::1', '2001:db8::/32'],
    );
  });

  it.each(['true', '1', '127.0.0.1/33', '::1/129', '10.0.0.1/-1', '10.0.0.1/8/1'])(
    'отклоняет неверную настройку %s',
    (value) => {
      expect(() => parseEnvironment({ ...base, TRUST_PROXY: value })).toThrow();
    },
  );

  it.each([
    'https://api.example/path',
    'https://api.example/',
    'ftp://api.example',
    'https://user:password@api.example',
  ])('отклоняет неверный origin %s', (value) => {
    expect(() => parseEnvironment({ ...base, API_PUBLIC_ORIGIN: value })).toThrow();
  });
});
