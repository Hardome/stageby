import type { SessionRow } from '#app/db/schema/sessions';
import type { UserRow } from '#app/db/schema/users';

export type AuthenticatedUser = Omit<UserRow, 'passwordHash'>;
export type AuthenticatedSession = Pick<SessionRow, 'id' | 'userId' | 'expiresAt' | 'createdAt'>;

export interface AuthenticationContext {
  user: AuthenticatedUser;
  session: AuthenticatedSession;
}
