import type { FastifyRequest } from 'fastify';

import type { auditEvents } from '#app/db/schema/audit';

export type AuditContext = Pick<
  typeof auditEvents.$inferInsert,
  'source' | 'requestId' | 'actorUserId' | 'actorSnapshot'
>;

export function requestAuditContext(request: FastifyRequest): AuditContext {
  const user = request.auth!.user;
  return {
    source: 'api',
    requestId: request.id,
    actorUserId: user.id,
    actorSnapshot: { fullName: user.fullName, login: user.login, role: user.role },
  };
}
