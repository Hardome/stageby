import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from '#app/db/schema/index';
import type { UserRow } from '#app/db/schema/users';

export type Database = NodePgDatabase<typeof schema>;
export type Actor = Pick<UserRow, 'id' | 'role'>;

export type FileOperationError =
  | 'checksum_mismatch'
  | 'file_too_large'
  | 'forbidden'
  | 'idempotency_conflict'
  | 'invalid_state'
  | 'not_found'
  | 'photo_limit_exceeded'
  | 'project_archived'
  | 'unsupported_mime_type'
  | 'upload_expired'
  | 'upload_incomplete';

export type FileOperationResult<T> = { status: 'ok'; value: T } | { status: FileOperationError };
