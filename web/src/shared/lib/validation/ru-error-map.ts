import { z } from 'zod';

type ZodIssue = Parameters<z.core.$ZodErrorMap>[0];
type ZodIssueByCode<TCode extends ZodIssue['code']> = Extract<ZodIssue, { code: TCode }>;

const requiredFieldMessage = 'Необходимо заполнить поле';
const requiredSelectMessage = 'Необходимо выбрать значение';

const typeNames: Record<string, string> = {
  string: 'строка',
  number: 'число',
  int: 'целое число',
  boolean: 'булево значение',
  bigint: 'большое число',
  function: 'функция',
  symbol: 'символ',
  array: 'массив',
  object: 'объект',
  date: 'дата',
  tuple: 'кортеж',
  record: 'словарь',
  map: 'словарь',
  set: 'множество',
  file: 'файл',
  nonoptional: 'обязательное значение',
  nan: 'NaN',
};

const invalidFormatMessages: Record<string, string> = {
  email: 'Неверный email адрес',
  url: 'Неверный URL',
  datetime: 'Неверная дата и время',
  date: 'Неверная дата',
  time: 'Неверное время',
  ipv4: 'Неверный IPv4 адрес',
  ipv6: 'Неверный IPv6 адрес',
};

function parsedType(input: unknown): string {
  if (input === null) return 'null';
  if (Array.isArray(input)) return 'массив';
  if (typeof input === 'number' && Number.isNaN(input)) return 'NaN';
  if (input instanceof Date) return 'дата';
  if (input instanceof Map) return 'словарь';

  return input instanceof Set ? 'множество' : (typeNames[typeof input] ?? typeof input);
}

function isEmptyInput(input: unknown): boolean {
  return typeof input === 'string' ? input.length === 0 : input === undefined || input === null;
}

function getInvalidTypeMessage(issue: ZodIssueByCode<'invalid_type'>): string {
  if (isEmptyInput(issue.input)) return requiredFieldMessage;
  const expected = typeNames[issue.expected] ?? issue.expected;

  return `Неверный ввод: ожидался ${expected}, получен — ${parsedType(issue.input)}`;
}

function getTooSmallMessage(issue: ZodIssueByCode<'too_small'>): string {
  if (issue.origin === 'string') return `Минимум символов: ${issue.minimum}`;

  return issue.origin === 'array'
    ? `Минимальное количество элементов: ${issue.minimum}`
    : `Минимальное значение: ${issue.minimum}`;
}

function getTooBigMessage(issue: ZodIssueByCode<'too_big'>): string {
  if (issue.origin === 'string') return `Максимум символов: ${issue.maximum}`;

  return issue.origin === 'array'
    ? `Максимальное количество элементов: ${issue.maximum}`
    : `Максимальное значение: ${issue.maximum}`;
}

function symbolCount(count: number): string {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} символов`;
  if (count % 10 === 1) return `${count} символ`;

  return count % 10 >= 2 && count % 10 <= 4 ? `${count} символа` : `${count} символов`;
}

function getPatternLengthMessage(issue: ZodIssueByCode<'invalid_format'>): string | undefined {
  if (typeof issue.pattern !== 'string' || typeof issue.input !== 'string') return;
  // Infer total length only when one quantified atom covers the entire input.
  const pattern = issue.pattern.replace(/^\/(.*)\/[a-z]*$/, '$1');
  const match = /^\^(?:\[[^\]]+\]|\\[dDsSwW]|\.)\{(\d+)(?:,(\d*))?\}\$$/.exec(pattern);
  if (!match) return;
  const minimum = Number(match[1]);
  const maximum = match[2] === undefined ? minimum : Number(match[2] || Infinity);
  const length = issue.input.length;
  if (minimum === maximum && length !== minimum) return `Требуется ${symbolCount(minimum)}`;
  if (length < minimum) return `Минимум символов: ${minimum}`;
  if (length > maximum) return `Максимум символов: ${maximum}`;
}

function getInvalidFormatMessage(issue: ZodIssueByCode<'invalid_format'>): string {
  if (isEmptyInput(issue.input)) return requiredFieldMessage;
  if (issue.format === 'uuid') return 'Неверный UUID';
  if (issue.format === 'regex') return getPatternLengthMessage(issue) ?? 'Неверный формат';
  const message = invalidFormatMessages[issue.format];
  if (message) return message;
  if (issue.format === 'starts_with' && typeof issue.prefix === 'string')
    return `Строка должна начинаться с "${issue.prefix}"`;
  if (issue.format === 'ends_with' && typeof issue.suffix === 'string')
    return `Строка должна заканчиваться на "${issue.suffix}"`;

  return issue.format === 'includes' && typeof issue.includes === 'string'
    ? `Строка должна содержать "${issue.includes}"`
    : 'Неверный формат';
}

function getIssueMessage(issue: ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type': {
      return getInvalidTypeMessage(issue);
    }
    case 'invalid_value': {
      return isEmptyInput(issue.input) ? requiredSelectMessage : 'Недопустимое значение';
    }
    case 'unrecognized_keys': {
      return `Нераспознанные ключи: ${issue.keys.join(', ')}`;
    }
    case 'invalid_union': {
      return 'Значение не соответствует ожидаемому варианту';
    }
    case 'too_small': {
      return getTooSmallMessage(issue);
    }
    case 'too_big': {
      return getTooBigMessage(issue);
    }
    case 'invalid_format': {
      return getInvalidFormatMessage(issue);
    }
    case 'not_multiple_of': {
      return `Число должно быть кратным ${issue.divisor}`;
    }
    case 'invalid_key': {
      return `Неверный ключ в ${typeNames[issue.origin] ?? issue.origin}`;
    }
    case 'invalid_element': {
      return `Неверное значение в ${typeNames[issue.origin] ?? issue.origin}`;
    }
    case 'custom': {
      return issue.message ?? 'Неверное значение';
    }
    default: {
      return 'Неверные входные данные';
    }
  }
}

export const ruErrorMap: z.core.$ZodErrorMap = (issue) => ({ message: getIssueMessage(issue) });

export function configureZod(): void {
  z.config({ customError: ruErrorMap, jitless: true });
}
