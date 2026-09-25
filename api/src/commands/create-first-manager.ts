import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { z } from 'zod';

import { type FirstManagerInput, FirstManagerRepository, initializeFirstManager } from '#app/commands/first-manager';
import * as databaseSchema from '#app/db/schema/index';

const firstManagerEnvironmentSchema = z.object({
  DATABASE_URL: z.string().refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'postgres:' || url.protocol === 'postgresql:';
      } catch {
        return false;
      }
    },
    { message: 'должен содержать адрес PostgreSQL' },
  ),
  FIRST_MANAGER_LOGIN: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9._-]{2,63}$/),
  FIRST_MANAGER_PASSWORD: z.string().min(8).max(128),
  FIRST_MANAGER_FULL_NAME: z
    .string()
    .min(1)
    .max(255)
    .refine((value) => value.trim().length > 0),
});

export interface FirstManagerEnvironment {
  databaseUrl: string;
  login: string;
  password: string;
  fullName: string;
}

export type FirstManagerPrompt = () => Promise<FirstManagerInput>;

export class InvalidFirstManagerEnvironmentError extends Error {
  readonly variables: string[];

  constructor(variables: string[]) {
    super(`Некорректные переменные окружения: ${variables.join(', ')}`);
    this.name = 'InvalidFirstManagerEnvironmentError';
    this.variables = variables;
  }
}

export class InteractiveTerminalRequiredError extends Error {
  constructor() {
    super('Для запуска без терминала задайте FIRST_MANAGER_LOGIN, FIRST_MANAGER_PASSWORD и FIRST_MANAGER_FULL_NAME.');
    this.name = 'InteractiveTerminalRequiredError';
  }
}

export function parseFirstManagerEnvironment(source: NodeJS.ProcessEnv): FirstManagerEnvironment {
  const result = firstManagerEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const variables = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new InvalidFirstManagerEnvironmentError(variables);
  }

  return {
    databaseUrl: result.data.DATABASE_URL,
    login: result.data.FIRST_MANAGER_LOGIN,
    password: result.data.FIRST_MANAGER_PASSWORD,
    fullName: result.data.FIRST_MANAGER_FULL_NAME,
  };
}

async function askVisible(question: string): Promise<string> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return await terminal.question(question);
  } finally {
    terminal.close();
  }
}

async function askHidden(question: string): Promise<string> {
  const hiddenOutput = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const terminal = createInterface({ input: process.stdin, output: hiddenOutput, terminal: true });
  process.stdout.write(question);

  try {
    return await terminal.question('');
  } finally {
    terminal.close();
    process.stdout.write('\n');
  }
}

export async function promptFirstManagerInput(): Promise<FirstManagerInput> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new InteractiveTerminalRequiredError();
  }

  const login = await askVisible('Логин: ');
  const fullName = await askVisible('ФИО: ');
  const password = await askHidden('Пароль: ');
  return { login, password, fullName };
}

export async function resolveFirstManagerEnvironment(
  source: NodeJS.ProcessEnv,
  prompt: FirstManagerPrompt = promptFirstManagerInput,
): Promise<FirstManagerEnvironment> {
  const configuredValues = [source.FIRST_MANAGER_LOGIN, source.FIRST_MANAGER_PASSWORD, source.FIRST_MANAGER_FULL_NAME];

  if (configuredValues.some((value) => value !== undefined)) {
    return parseFirstManagerEnvironment(source);
  }

  const input = await prompt();
  return parseFirstManagerEnvironment({
    ...source,
    FIRST_MANAGER_LOGIN: input.login,
    FIRST_MANAGER_PASSWORD: input.password,
    FIRST_MANAGER_FULL_NAME: input.fullName,
  });
}

export async function runCreateFirstManager(
  source: NodeJS.ProcessEnv = process.env,
  prompt: FirstManagerPrompt = promptFirstManagerInput,
): Promise<void> {
  const environment = await resolveFirstManagerEnvironment(source, prompt);
  const pool = new Pool({ connectionString: environment.databaseUrl });
  const database = drizzle({ client: pool, schema: databaseSchema });

  try {
    const result = await initializeFirstManager(new FirstManagerRepository(database), {
      login: environment.login,
      password: environment.password,
      fullName: environment.fullName,
    });

    if (result.status === 'already_initialized') {
      console.info('Пользователи уже существуют. Изменений не внесено.');
      return;
    }

    console.info(`Первый руководитель создан (id: ${result.id}).`);
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  if (existsSync('.env')) {
    loadEnvFile('.env');
  }

  try {
    await runCreateFirstManager();
  } catch (error) {
    if (error instanceof InvalidFirstManagerEnvironmentError || error instanceof InteractiveTerminalRequiredError) {
      console.error(error.message);
    } else {
      console.error('Не удалось создать первого руководителя. Проверьте подключение к БД и состояние миграций.');
    }
    process.exitCode = 1;
  }
}
