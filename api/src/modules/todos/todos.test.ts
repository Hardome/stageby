import { randomUUID } from 'node:crypto';

import { eq, inArray } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { todos } from '#app/db/schema/todos';
import { todoModule } from '#app/modules/todos/index';
import type { Todo } from '#app/modules/todos/types';
import { setupModuleTest } from '#test/setup-module-test';

const getApp = setupModuleTest(todoModule);
const createdIds: string[] = [];

afterEach(async () => {
  if (createdIds.length > 0) {
    const app = getApp();
    await app.db.delete(todos).where(inArray(todos.id, createdIds));
    createdIds.length = 0;
  }
});

describe('Модуль задач', () => {
  it('создаёт, читает, обновляет и удаляет задачу через PostgreSQL', async () => {
    const app = getApp();
    const createResponse = await app.inject({
      method: 'POST',
      url: '/todos',
      payload: { title: `Интеграционный тест ${randomUUID()}`, description: null },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json<Todo>();
    createdIds.push(created.id);
    expect(created).toMatchObject({ description: null, completed: false });

    const [stored] = await app.db.select().from(todos).where(eq(todos.id, created.id));
    expect(stored).toMatchObject({ id: created.id, title: created.title, completed: false });

    const listResponse = await app.inject({ method: 'GET', url: '/todos' });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json<Todo[]>()).toContainEqual(created);

    const getResponse = await app.inject({ method: 'GET', url: `/todos/${created.id}` });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual(created);

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/todos/${created.id}`,
      payload: { completed: true },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({ id: created.id, completed: true });

    const [updated] = await app.db.select().from(todos).where(eq(todos.id, created.id));
    expect(updated?.completed).toBe(true);

    const deleteResponse = await app.inject({ method: 'DELETE', url: `/todos/${created.id}` });
    expect(deleteResponse.statusCode).toBe(204);
    expect(deleteResponse.body).toBe('');

    const remaining = await app.db.select().from(todos).where(eq(todos.id, created.id));
    expect(remaining).toEqual([]);

    const missingResponse = await app.inject({ method: 'GET', url: `/todos/${created.id}` });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual({ error: 'Не найдено', message: 'Задача не найдена' });
  });

  it('проверяет запросы по схемам контракта', async () => {
    const app = getApp();
    const createResponse = await app.inject({ method: 'POST', url: '/todos', payload: {} });
    expect(createResponse.statusCode).toBe(400);

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/todos/${randomUUID()}`,
      payload: {},
    });
    expect(updateResponse.statusCode).toBe(400);

    const invalidIdResponse = await app.inject({ method: 'GET', url: '/todos/not-a-uuid' });
    expect(invalidIdResponse.statusCode).toBe(400);
  });
});
