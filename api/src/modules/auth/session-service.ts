import type { SessionRow } from '#app/db/schema/sessions';
import type { SessionRepository } from '#app/modules/auth/session-repository';
import { createSessionToken, hashSessionToken } from '#app/modules/auth/session-token';

const HOUR_IN_MILLISECONDS = 60 * 60 * 1000;

export interface IssuedSession {
  accessToken: string;
  expiresAt: Date;
  session: SessionRow;
}

export class SessionService {
  readonly #repository: SessionRepository;
  readonly #ttlHours: number;

  constructor(repository: SessionRepository, ttlHours: number) {
    if (!Number.isInteger(ttlHours) || ttlHours < 1 || ttlHours > 12) {
      throw new RangeError('Срок сессии должен быть целым числом от 1 до 12 часов');
    }

    this.#repository = repository;
    this.#ttlHours = ttlHours;
  }

  async issue(userId: number, issuedAt = new Date()): Promise<IssuedSession> {
    const { accessToken, tokenHash } = createSessionToken();
    const expiresAt = new Date(issuedAt.getTime() + this.#ttlHours * HOUR_IN_MILLISECONDS);
    const session = await this.#repository.create({ userId, tokenHash, expiresAt, createdAt: issuedAt });

    return { accessToken, expiresAt, session };
  }

  revoke(accessToken: string, revokedAt = new Date()): Promise<boolean> {
    return this.#repository.revokeByTokenHash(hashSessionToken(accessToken), revokedAt);
  }
}
