import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as databaseSchema from '#app/db/schema/index';
import { todos } from '#app/db/schema/todos';
import type { CreateTodo, TodoRow, UpdateTodo } from '#app/modules/todos/types';

export class TodoRepository {
  readonly #database: NodePgDatabase<typeof databaseSchema>;

  constructor(database: NodePgDatabase<typeof databaseSchema>) {
    this.#database = database;
  }

  async findAll(): Promise<TodoRow[]> {
    return this.#database.select().from(todos);
  }

  async findById(id: string): Promise<TodoRow | null> {
    const [row] = await this.#database.select().from(todos).where(eq(todos.id, id)).limit(1);
    return row ?? null;
  }

  async create(input: CreateTodo): Promise<TodoRow> {
    const [row] = await this.#database
      .insert(todos)
      .values({
        title: input.title,
        description: input.description ?? null,
      })
      .returning();

    if (!row) {
      throw new Error('Не удалось создать задачу');
    }

    return row;
  }

  async update(id: string, input: UpdateTodo): Promise<TodoRow | null> {
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
    return row ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.#database.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id });
    return rows.length > 0;
  }
}
