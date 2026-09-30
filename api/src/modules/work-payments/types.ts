import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from '#app/db/schema/index';

export type Database = NodePgDatabase<typeof schema>;

export type WorkPaymentOperationError = 'not_found' | 'project_archived' | 'version_conflict';

export type WorkPaymentOperationResult<T> = { status: 'ok'; value: T } | { status: WorkPaymentOperationError };
