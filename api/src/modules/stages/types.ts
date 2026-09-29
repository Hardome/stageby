import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from '#app/db/schema/index';
import type { UserRow } from '#app/db/schema/users';

export type Database = NodePgDatabase<typeof schema>;
export type Actor = Pick<UserRow, 'id' | 'role'>;

export type StageOperationError =
  | 'forbidden'
  | 'invalid_request'
  | 'invalid_transition'
  | 'not_found'
  | 'photo_required'
  | 'project_archived'
  | 'version_conflict';

export type OperationResult<T> = { status: 'ok'; value: T } | { status: StageOperationError };
