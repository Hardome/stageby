import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as databaseSchema from '#app/db/schema/index';
import { type UserRow, users } from '#app/db/schema/users';

export interface CreateUserRecord {
  login: string;
  passwordHash: string;
  fullName: string;
  role: UserRow['role'];
  phone?: string | null;
}

export class UserRepository {
  readonly #database: NodePgDatabase<typeof databaseSchema>;

  constructor(database: NodePgDatabase<typeof databaseSchema>) {
    this.#database = database;
  }

  async findById(id: number): Promise<UserRow | null> {
    const [user] = await this.#database.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async findByLogin(login: string): Promise<UserRow | null> {
    const [user] = await this.#database.select().from(users).where(eq(users.login, login)).limit(1);
    return user ?? null;
  }

  async create(input: CreateUserRecord): Promise<UserRow> {
    const [user] = await this.#database.insert(users).values(input).returning();

    if (!user) {
      throw new Error('Не удалось создать пользователя');
    }

    return user;
  }
}
