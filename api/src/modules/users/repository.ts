import { and, asc, count, eq, ilike, isNull, ne, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as databaseSchema from '#app/db/schema/index';
import { sessions } from '#app/db/schema/sessions';
import { stages } from '#app/db/schema/stages';
import { type UserRow, users } from '#app/db/schema/users';
import type { UpdateUser } from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import { auditedTransaction } from '#app/modules/audit/repository';

type Database = NodePgDatabase<typeof databaseSchema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface CreateUserRecord {
  login: string;
  passwordHash: string;
  fullName: string;
  role: UserRow['role'];
  phone?: string | null;
}

export interface ListUsersInput {
  limit: number;
  offset: number;
  role?: UserRow['role'];
  isActive?: boolean;
  search?: string;
}

export interface UserPageRecord {
  items: UserRow[];
  total: number;
}

export class LoginTakenError extends Error {
  constructor() {
    super('Логин уже занят');
    this.name = 'LoginTakenError';
  }
}

function hasLoginConstraint(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  if ('code' in error && error.code === '23505' && 'constraint' in error && error.constraint === 'users_login_unique') {
    return true;
  }

  return 'cause' in error && hasLoginConstraint(error.cause);
}

async function lockActiveManagers(transaction: Transaction, shouldLock: boolean): Promise<number[] | null> {
  if (!shouldLock) {
    return null;
  }

  const activeManagers = await transaction
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'manager'), eq(users.isActive, true)))
    .orderBy(asc(users.id))
    .for('update');
  return activeManagers.map((manager) => manager.id);
}

async function findForUpdate(transaction: Transaction, id: number): Promise<UserRow | null> {
  const [user] = await transaction.select().from(users).where(eq(users.id, id)).limit(1).for('update');
  return user ?? null;
}

async function hasUnfinishedAssignment(transaction: Transaction, userId: number): Promise<boolean> {
  const [assignment] = await transaction
    .select({ id: stages.id })
    .from(stages)
    .where(and(ne(stages.status, 'completed'), or(eq(stages.assigneeId, userId), eq(stages.inspectorId, userId))))
    .limit(1);
  return assignment !== undefined;
}

function mayRemoveActiveManager(input: UpdateUser): boolean {
  return input.isActive === false || (input.role !== undefined && input.role !== 'manager');
}

interface ChangeEffects {
  roleChanges: boolean;
  deactivates: boolean;
  removesActiveManager: boolean;
}

function getChangeEffects(current: UserRow, input: UpdateUser): ChangeEffects {
  const roleChanges = input.role !== undefined && input.role !== current.role;
  const deactivates = input.isActive === false && current.isActive;
  return {
    roleChanges,
    deactivates,
    removesActiveManager: current.role === 'manager' && current.isActive && (roleChanges || deactivates),
  };
}

async function getSecurityConflict(
  transaction: Transaction,
  current: UserRow,
  input: UpdateUser,
  activeManagerIds: number[] | null,
): Promise<'last_manager' | 'user_in_use' | null> {
  const effects = getChangeEffects(current, input);

  if (effects.removesActiveManager && activeManagerIds?.length === 1) {
    return 'last_manager';
  }

  if ((effects.roleChanges || effects.deactivates) && (await hasUnfinishedAssignment(transaction, current.id))) {
    return 'user_in_use';
  }

  return null;
}

export type UpdateUserResult =
  | { status: 'updated'; user: UserRow }
  | { status: 'not_found' }
  | { status: 'last_manager' }
  | { status: 'user_in_use' };

export class UserRepository {
  readonly #database: Database;

  constructor(database: NodePgDatabase<typeof databaseSchema>) {
    this.#database = database;
  }

  async list(input: ListUsersInput): Promise<UserPageRecord> {
    const conditions = [];

    if (input.role !== undefined) {
      conditions.push(eq(users.role, input.role));
    }

    if (input.isActive !== undefined) {
      conditions.push(eq(users.isActive, input.isActive));
    }

    if (input.search !== undefined) {
      const escapedSearch = input.search.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
      const pattern = `%${escapedSearch}%`;
      conditions.push(or(ilike(users.fullName, pattern), ilike(users.login, pattern))!);
    }

    const filter = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, [totalRow]] = await Promise.all([
      this.#database
        .select()
        .from(users)
        .where(filter)
        .orderBy(asc(users.fullName), asc(users.id))
        .limit(input.limit)
        .offset(input.offset),
      this.#database.select({ value: count() }).from(users).where(filter),
    ]);

    return { items, total: totalRow?.value ?? 0 };
  }

  async findById(id: number): Promise<UserRow | null> {
    const [user] = await this.#database.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  async findByLogin(login: string): Promise<UserRow | null> {
    const [user] = await this.#database.select().from(users).where(eq(users.login, login)).limit(1);
    return user ?? null;
  }

  async create(input: CreateUserRecord, context: AuditContext = { source: 'system' }): Promise<UserRow> {
    try {
      return await auditedTransaction(this.#database, context, 'createUser', async (transaction, audit) => {
        const [user] = await audit.created(users, await transaction.insert(users).values(input).returning());
        if (!user) throw new Error('User was not inserted');
        return user;
      });
    } catch (error) {
      if (hasLoginConstraint(error)) {
        throw new LoginTakenError();
      }

      throw new Error('Не удалось создать пользователя');
    }
  }

  async updateAtomically(
    id: number,
    input: UpdateUser,
    context: AuditContext = { source: 'system' },
  ): Promise<UpdateUserResult> {
    return auditedTransaction(this.#database, context, 'updateUser', async (transaction, audit) => {
      const activeManagerIds = await lockActiveManagers(transaction, mayRemoveActiveManager(input));
      const current = await findForUpdate(transaction, id);

      if (!current) {
        return { status: 'not_found' };
      }

      const securityConflict = await getSecurityConflict(transaction, current, input, activeManagerIds);
      if (securityConflict) {
        return { status: securityConflict };
      }

      if (Object.entries(input).every(([field, value]) => current[field as keyof UserRow] === value)) {
        return { status: 'updated', user: current };
      }

      const effects = getChangeEffects(current, input);
      const changedAt = new Date();

      const [updated] = await audit.mutate(users, eq(users.id, id), () =>
        transaction
          .update(users)
          .set({ ...input, updatedAt: changedAt })
          .where(eq(users.id, id))
          .returning(),
      );

      if (!updated) {
        return { status: 'not_found' };
      }

      if (effects.roleChanges || effects.deactivates) {
        await transaction
          .update(sessions)
          .set({ revokedAt: changedAt })
          .where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));
      }

      return { status: 'updated', user: updated };
    });
  }

  async setPasswordAtomically(
    id: number,
    passwordHash: string,
    context: AuditContext = { source: 'system' },
  ): Promise<boolean> {
    try {
      return await auditedTransaction(this.#database, context, 'setUserPassword', async (transaction, audit) => {
        const [user] = await transaction
          .select({ id: users.id, passwordResetRequestedAt: users.passwordResetRequestedAt })
          .from(users)
          .where(eq(users.id, id))
          .limit(1)
          .for('update');

        if (!user) {
          return false;
        }

        const changedAt = new Date();
        const write = () =>
          transaction
            .update(users)
            .set({ passwordHash, passwordResetRequestedAt: null, updatedAt: changedAt })
            .where(eq(users.id, id));
        if (user.passwordResetRequestedAt !== null) await audit.mutate(users, eq(users.id, id), write);
        else await write();
        await transaction
          .update(sessions)
          .set({ revokedAt: changedAt })
          .where(and(eq(sessions.userId, id), isNull(sessions.revokedAt)));
        audit.recordEvent();
        return true;
      });
    } catch {
      throw new Error('Не удалось изменить пароль пользователя');
    }
  }

  async requestPasswordReset(login: string, context: AuditContext): Promise<void> {
    await auditedTransaction(this.#database, context, 'requestPasswordReset', async (transaction, audit) => {
      const [user] = await transaction
        .select()
        .from(users)
        .where(and(eq(users.login, login), eq(users.isActive, true)))
        .for('update');
      if (!user || user.passwordResetRequestedAt !== null) return;
      const now = new Date();
      await audit.mutate(users, eq(users.id, user.id), () =>
        transaction.update(users).set({ passwordResetRequestedAt: now, updatedAt: now }).where(eq(users.id, user.id)),
      );
    });
  }
}
