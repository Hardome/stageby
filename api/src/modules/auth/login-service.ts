import type { UserRow } from '#app/db/schema/users';
import { verifyPassword } from '#app/modules/auth/password-hasher';
import type { IssuedSession, SessionService } from '#app/modules/auth/session-service';
import type { UserRepository } from '#app/modules/users/repository';

// A valid Argon2id hash makes an unknown login take the same expensive path as a known login.
// cspell:ignore Jqej Qhzjg xmbp
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$WoEJqejQhzjgV-xmbp-zDA$LINZa58w7DbSRVUg0GdvPamZ9XPLNc2hhcKQdSoFrf4';

export interface LoginResult {
  user: UserRow;
  issuedSession: IssuedSession;
}

export class LoginService {
  readonly #users: UserRepository;
  readonly #sessions: SessionService;

  constructor(users: UserRepository, sessions: SessionService) {
    this.#users = users;
    this.#sessions = sessions;
  }

  async login(login: string, password: string): Promise<LoginResult | null> {
    const user = await this.#users.findByLogin(login);
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches || !user.isActive) {
      return null;
    }

    const issuedSession = await this.#sessions.issue(user.id);
    return { user, issuedSession };
  }
}
