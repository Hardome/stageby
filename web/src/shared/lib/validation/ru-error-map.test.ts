import { z } from 'zod';

import { createUserSchema as userCreationSchema } from '@api/zod/createUserSchema';

import { configureZod, ruErrorMap } from './ru-error-map';

function errorMessage(schema: z.ZodType, input: unknown): string {
  const result = schema.safeParse(input);
  if (result.success) throw new Error('Expected validation to fail');

  return result.error.issues[0]?.message ?? '';
}

describe('Russian Zod errors', () => {
  it.each([
    [z.string(), undefined, 'Необходимо заполнить поле'],
    [z.number(), null, 'Необходимо заполнить поле'],
    [z.number(), '', 'Необходимо заполнить поле'],
    [z.enum(['manager', 'foreman']), undefined, 'Необходимо выбрать значение'],
    [z.enum(['manager', 'foreman']), 'unknown', 'Недопустимое значение'],
    [z.string().min(3), 'ab', 'Минимум символов: 3'],
    [z.string().max(3), 'abcd', 'Максимум символов: 3'],
    [z.array(z.string()).min(2), [], 'Минимальное количество элементов: 2'],
    [z.array(z.string()).max(1), ['a', 'b'], 'Максимальное количество элементов: 1'],
    [z.number().min(2), 1, 'Минимальное значение: 2'],
    [z.number().max(2), 3, 'Максимальное значение: 2'],
    [z.email(), 'invalid', 'Неверный email адрес'],
    [z.url(), 'invalid', 'Неверный URL'],
    [z.iso.datetime(), 'invalid', 'Неверная дата и время'],
    [z.iso.date(), 'invalid', 'Неверная дата'],
    [z.iso.time(), 'invalid', 'Неверное время'],
    [z.ipv4(), 'invalid', 'Неверный IPv4 адрес'],
    [z.ipv6(), 'invalid', 'Неверный IPv6 адрес'],
    [z.uuid(), 'invalid', 'Неверный UUID'],
    [z.uuid(), '', 'Необходимо заполнить поле'],
    [z.string().regex(/^[A-Z]+$/), 'abc', 'Неверный формат'],
    [z.string().startsWith('start'), 'other', 'Строка должна начинаться с "start"'],
    [z.string().endsWith('end'), 'other', 'Строка должна заканчиваться на "end"'],
    [z.string().includes('part'), 'other', 'Строка должна содержать "part"'],
    [z.number().multipleOf(3), 5, 'Число должно быть кратным 3'],
    [z.union([z.string(), z.number()]), false, 'Значение не соответствует ожидаемому варианту'],
    [z.strictObject({}), { extra: 1 }, 'Нераспознанные ключи: extra'],
    [z.string().refine(() => false), 'value', 'Неверное значение'],
  ])('localizes validation case %#', (schema, input, expected) => {
    expect(errorMessage(schema, input)).toBe(expected);
  });

  it.each([
    [String.raw`^\d{1}$`, '22', 'Требуется 1 символ'],
    [/^\d{2}$/, '1', 'Требуется 2 символа'],
    [/^\d{5}$/, '1', 'Требуется 5 символов'],
    [/^\d{11}$/, '1', 'Требуется 11 символов'],
    [/^\d{21}$/, '1', 'Требуется 21 символ'],
    [/^.{2,4}$/, 'a', 'Минимум символов: 2'],
    [/^.{2,4}$/, 'abcde', 'Максимум символов: 4'],
    [/^.{2,}$/, 'a', 'Минимум символов: 2'],
    [/^[A-Z]{2}\d{4}$/, 'a', 'Неверный формат'],
    [/^\d{4}$/, 'abcd', 'Неверный формат'],
  ])('infers only unambiguous total pattern lengths for %s', (pattern, input, expected) => {
    const expression = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    expect(errorMessage(z.string().regex(expression), input)).toBe(expected);
  });

  it('describes actual types without reading an object constructor', () => {
    expect(errorMessage(z.number(), 'abc')).toBe('Неверный ввод: ожидался число, получен — строка');
    expect(errorMessage(z.string(), NaN)).toContain('NaN');
    expect(errorMessage(z.string(), [])).toContain('массив');
    expect(errorMessage(z.string(), Object.create(null))).toContain('объект');
  });

  it('preserves explicit schema and refinement messages', () => {
    configureZod();
    expect(errorMessage(z.string().min(5, 'Введите минимум пять символов.'), 'a')).toBe(
      'Введите минимум пять символов.',
    );
    expect(
      errorMessage(
        z.string().refine(() => false, 'Своя ошибка.'),
        'value',
      ),
    ).toBe('Своя ошибка.');
  });

  it('localizes collection issues', () => {
    expect(ruErrorMap({ code: 'invalid_key', origin: 'record', issues: [], input: {} })).toEqual({
      message: 'Неверный ключ в словарь',
    });
    expect(
      ruErrorMap({ code: 'invalid_element', origin: 'set', key: 'invalid', issues: [], input: new Set() }),
    ).toEqual({ message: 'Неверное значение в множество' });
  });

  it('localizes generated contract constraints used by frontend forms', () => {
    const result = userCreationSchema.safeParse({
      fullName: 'Имя',
      login: 'new.user',
      phone: '',
      role: 'foreman',
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.error?.issues.find((issue) => issue.path[0] === 'password')?.message).toBe('Минимум символов: 8');
  });
});
