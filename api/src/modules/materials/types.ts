import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from '#app/db/schema/index';
import type { UserRow } from '#app/db/schema/users';

export type Database = NodePgDatabase<typeof schema>;
export type Actor = Pick<UserRow, 'id' | 'role'>;
export type MaterialOperationError =
  | 'forbidden'
  | 'invalid_request'
  | 'invalid_transition'
  | 'not_found'
  | 'project_archived'
  | 'version_conflict';
export type MaterialOperationResult<T> = { status: 'ok'; value: T } | { status: MaterialOperationError };
