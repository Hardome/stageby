import type { AuthenticationContext } from '#app/modules/auth/authentication-context';
import type { AuthenticationRepository } from '#app/modules/auth/authentication-repository';
import { hashSessionToken, isSessionToken } from '#app/modules/auth/session-token';

export class AuthenticationService {
  readonly #repository: AuthenticationRepository;

  constructor(repository: AuthenticationRepository) {
    this.#repository = repository;
  }

  authenticate(accessToken: string, now = new Date()): Promise<AuthenticationContext | null> {
    if (!isSessionToken(accessToken)) {
      return Promise.resolve(null);
    }

    return this.#repository.findByActiveTokenHash(hashSessionToken(accessToken), now);
  }
}
