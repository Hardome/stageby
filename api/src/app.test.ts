import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';
import { parseEnvironment } from './config/env.js';
import type { CreateTodo, Todo, UpdateTodo } from './generated/types.gen.js';
import type { TodoRepository } from './todos/todo-repository.js';

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

class InMemoryTodoRepository implements TodoRepository {
  readonly #todos = new Map<string, Todo>();

  async findAll(): Promise<Todo[]> {
    return [...this.#todos.values()];
  }

  async findById(id: string): Promise<Todo | null> {
    return this.#todos.get(id) ?? null;
  }

  async create(input: CreateTodo): Promise<Todo> {
    const now = new Date().toISOString();
    const todo: Todo = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? null,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    this.#todos.set(todo.id, todo);
    return todo;
  }

  async update(id: string, input: UpdateTodo): Promise<Todo | null> {
    const current = this.#todos.get(id);

    if (!current) {
      return null;
    }

    const todo: Todo = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    this.#todos.set(id, todo);
    return todo;
  }

  async delete(id: string): Promise<boolean> {
    return this.#todos.delete(id);
  }
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function createEnvironment() {
  return parseEnvironment({
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '3001',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/stageby_test',
    CORS_ORIGIN: 'http://localhost:5173',
    RATE_LIMIT_MAX: '100',
    RATE_LIMIT_TIME_WINDOW: '1 minute',
  });
}

async function createTestApp(repository = new InMemoryTodoRepository()) {
  const app = await buildApp({
    environment: createEnvironment(),
    todoRepository: repository,
  });

  apps.push(app);
  return app;
}

describe('application', () => {
  it('serves the OpenAPI contract through Swagger UI', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      info: {
        title: 'Stageby API',
        version: '0.0.0',
      },
      paths: {
        '/todos': {},
        '/todos/{id}': {},
      },
    });
  });

  it('creates, reads, updates, lists and deletes todos', async () => {
    const app = await createTestApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/todos',
      payload: {
        title: 'Build foundation',
        description: null,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json<Todo>();
    expect(created).toMatchObject({
      title: 'Build foundation',
      description: null,
      completed: false,
    });

    const listResponse = await app.inject({ method: 'GET', url: '/todos' });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual([created]);

    const getResponse = await app.inject({ method: 'GET', url: `/todos/${created.id}` });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual(created);

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/todos/${created.id}`,
      payload: { completed: true },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      id: created.id,
      completed: true,
    });

    const deleteResponse = await app.inject({ method: 'DELETE', url: `/todos/${created.id}` });
    expect(deleteResponse.statusCode).toBe(204);
    expect(deleteResponse.body).toBe('');

    const missingResponse = await app.inject({ method: 'GET', url: `/todos/${created.id}` });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual({
      error: 'Not Found',
      message: 'Todo not found',
    });
  });

  it('validates todo requests against the contract schemas', async () => {
    const app = await createTestApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/todos',
      payload: {},
    });
    expect(createResponse.statusCode).toBe(400);

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/todos/${randomUUID()}`,
      payload: {},
    });
    expect(updateResponse.statusCode).toBe(400);

    const invalidIdResponse = await app.inject({
      method: 'GET',
      url: '/todos/not-a-uuid',
    });
    expect(invalidIdResponse.statusCode).toBe(400);
  });
});
