import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { auditChanges, auditEvents } from '#app/db/schema/audit';

export async function auditRecords(database: FastifyInstance['db'], actorUserId: number | null, operation: string) {
  const events = await database
    .select()
    .from(auditEvents)
    .where(
      and(
        actorUserId === null ? isNull(auditEvents.actorUserId) : eq(auditEvents.actorUserId, actorUserId),
        eq(auditEvents.operation, operation),
      ),
    )
    .orderBy(auditEvents.id);
  const changes =
    events.length > 0
      ? await database
          .select()
          .from(auditChanges)
          .where(
            inArray(
              auditChanges.eventId,
              events.map((event) => event.id),
            ),
          )
          .orderBy(auditChanges.id)
      : [];
  return { events, changes };
}
