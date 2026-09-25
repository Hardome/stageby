import { describe, expect, it, vi } from 'vitest';

import {
  InvalidFirstManagerEnvironmentError,
  parseFirstManagerEnvironment,
  resolveFirstManagerEnvironment,
} from '#app/commands/create-first-manager';
import { type FirstManagerStore, initializeFirstManager } from '#app/commands/first-manager';
import { verifyPassword } from '#app/modules/auth/password-hasher';

const environment = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/stageby',
  FIRST_MANAGER_LOGIN: 'admin',
  FIRST_MANAGER_PASSWORD: 'Manager-password-123!',
  FIRST_MANAGER_FULL_NAME: 'Первый руководитель',
};

describe('создание первого руководителя', () => {
  it('проверяет и преобразует переменные окружения', () => {
    expect(parseFirstManagerEnvironment(environment)).toEqual({
      databaseUrl: environment.DATABASE_URL,
      login: environment.FIRST_MANAGER_LOGIN,
      password: environment.FIRST_MANAGER_PASSWORD,
      fullName: environment.FIRST_MANAGER_FULL_NAME,
    });
  });

  it('запрашивает данные интерактивно, когда переменные не заданы', async () => {
    const prompt = vi.fn(async () => ({
      login: environment.FIRST_MANAGER_LOGIN,
      password: environment.FIRST_MANAGER_PASSWORD,
      fullName: environment.FIRST_MANAGER_FULL_NAME,
    }));

    await expect(resolveFirstManagerEnvironment({ DATABASE_URL: environment.DATABASE_URL }, prompt)).resolves.toEqual({
      databaseUrl: environment.DATABASE_URL,
      login: environment.FIRST_MANAGER_LOGIN,
      password: environment.FIRST_MANAGER_PASSWORD,
      fullName: environment.FIRST_MANAGER_FULL_NAME,
    });
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('не открывает интерактивный ввод при полной конфигурации окружения', async () => {
    const prompt = vi.fn(async () => {
      throw new Error('Интерактивный ввод не ожидался');
    });

    await expect(resolveFirstManagerEnvironment(environment, prompt)).resolves.toEqual({
      databaseUrl: environment.DATABASE_URL,
      login: environment.FIRST_MANAGER_LOGIN,
      password: environment.FIRST_MANAGER_PASSWORD,
      fullName: environment.FIRST_MANAGER_FULL_NAME,
    });
    expect(prompt).not.toHaveBeenCalled();
  });

  it('не включает значение пароля в ошибку валидации', () => {
    const invalidPassword = 'short';
    let validationError: unknown;

    try {
      parseFirstManagerEnvironment({ ...environment, FIRST_MANAGER_PASSWORD: invalidPassword });
    } catch (error) {
      validationError = error;
    }

    expect(validationError).toBeInstanceOf(InvalidFirstManagerEnvironmentError);
    expect(String(validationError)).not.toContain(invalidPassword);
    expect(validationError).toMatchObject({ variables: ['FIRST_MANAGER_PASSWORD'] });
  });

  it('передаёт в хранилище только хеш пароля', async () => {
    const createIfEmpty = vi.fn<FirstManagerStore['createIfEmpty']>(async () => ({ status: 'created', id: 1 }));

    const result = await initializeFirstManager(
      { createIfEmpty },
      {
        login: environment.FIRST_MANAGER_LOGIN,
        password: environment.FIRST_MANAGER_PASSWORD,
        fullName: environment.FIRST_MANAGER_FULL_NAME,
      },
    );

    expect(result).toEqual({ status: 'created', id: 1 });
    expect(createIfEmpty).toHaveBeenCalledOnce();
    const record = createIfEmpty.mock.calls[0]?.[0];
    expect(record?.passwordHash).not.toBe(environment.FIRST_MANAGER_PASSWORD);
    expect(await verifyPassword(environment.FIRST_MANAGER_PASSWORD, record?.passwordHash ?? '')).toBe(true);
  });

  it('явно возвращает безопасный результат повторного запуска', async () => {
    const createIfEmpty = vi.fn<FirstManagerStore['createIfEmpty']>(async () => ({ status: 'already_initialized' }));

    await expect(
      initializeFirstManager(
        { createIfEmpty },
        {
          login: environment.FIRST_MANAGER_LOGIN,
          password: environment.FIRST_MANAGER_PASSWORD,
          fullName: environment.FIRST_MANAGER_FULL_NAME,
        },
      ),
    ).resolves.toEqual({ status: 'already_initialized' });
  });
});
