import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as databaseSchema from '../db/schema.js';
import { todos } from '../db/schema.js';
import type { CreateTodo, Todo, UpdateTodo } from '../generated/types.gen.js';
import type { TodoRepository } from './todo-repository.js';

type TodoRow = typeof todos.$inferSelect;

function mapTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DrizzleTodoRepository implements TodoRepository {
  readonly #database: NodePgDatabase<typeof databaseSchema>;

  constructor(database: NodePgDatabase<typeof databaseSchema>) {
    this.#database = database;
  }

  async findAll(): Promise<Todo[]> {
    const rows = await this.#database.select().from(todos);
    return rows.map(mapTodo);
  }

  async findById(id: string): Promise<Todo | null> {
    const [row] = await this.#database.select().from(todos).where(eq(todos.id, id)).limit(1);
    return row ? mapTodo(row) : null;
  }

  async create(input: CreateTodo): Promise<Todo> {
    const [row] = await this.#database
      .insert(todos)
      .values({
        title: input.title,
        description: input.description ?? null,
      })
      .returning();

    if (!row) {
      throw new Error('Failed to create todo');
    }

    return mapTodo(row);
  }

  async update(id: string, input: UpdateTodo): Promise<Todo | null> {
    const values: Partial<typeof todos.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) {
      values.title = input.title;
    }

    if (input.description !== undefined) {
      values.description = input.description;
    }

    if (input.completed !== undefined) {
      values.completed = input.completed;
    }

    const [row] = await this.#database.update(todos).set(values).where(eq(todos.id, id)).returning();
    return row ? mapTodo(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.#database.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id });
    return rows.length > 0;
  }
}
