import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as databaseSchema from '#app/db/schema/index';
import { users } from '#app/db/schema/users';
import { auditedTransaction } from '#app/modules/audit/repository';
import { hashPassword } from '#app/modules/auth/password-hasher';

type Database = NodePgDatabase<typeof databaseSchema>;

export interface FirstManagerInput {
  login: string;
  password: string;
  fullName: string;
}

interface CreateFirstManagerRecord {
  login: string;
  passwordHash: string;
  fullName: string;
}

export type CreateFirstManagerResult = { status: 'created'; id: number } | { status: 'already_initialized' };

export interface FirstManagerStore {
  createIfEmpty(input: CreateFirstManagerRecord): Promise<CreateFirstManagerResult>;
}

export class FirstManagerRepository implements FirstManagerStore {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  async createIfEmpty(input: CreateFirstManagerRecord): Promise<CreateFirstManagerResult> {
    return auditedTransaction(
      this.#database,
      { source: 'command' },
      'createFirstManager',
      async (transaction, audit) => {
        // The table lock makes concurrent bootstrap commands observe the same initialized state.
        await transaction.execute(sql`lock table ${users} in exclusive mode`);

        const [existingUser] = await transaction.select({ id: users.id }).from(users).limit(1);
        if (existingUser) {
          return { status: 'already_initialized' };
        }

        const [manager] = await audit.created(
          users,
          await transaction
            .insert(users)
            .values({
              login: input.login,
              passwordHash: input.passwordHash,
              fullName: input.fullName,
              role: 'manager',
              isActive: true,
            })
            .returning(),
        );

        if (!manager) {
          throw new Error('Не удалось создать первого руководителя');
        }

        return { status: 'created', id: manager.id };
      },
    );
  }
}

export async function initializeFirstManager(
  store: FirstManagerStore,
  input: FirstManagerInput,
): Promise<CreateFirstManagerResult> {
  const passwordHash = await hashPassword(input.password);
  return store.createIfEmpty({
    login: input.login,
    passwordHash,
    fullName: input.fullName,
  });
}
