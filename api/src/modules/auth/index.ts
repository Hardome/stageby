import type { FastifyPluginAsync } from 'fastify';

import type { Environment } from '#app/config/env';
import { LoginService } from '#app/modules/auth/login-service';
import { registerAuthRoutes } from '#app/modules/auth/routes';
import { registerSessionCleanup } from '#app/modules/auth/session-cleanup';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { UserRepository } from '#app/modules/users/repository';

type AuthModuleOptions = Pick<
  Environment,
  'NODE_ENV' | 'SESSION_TTL_HOURS' | 'LOGIN_RATE_LIMIT_MAX' | 'LOGIN_RATE_LIMIT_TIME_WINDOW'
> & { SESSION_CLEANUP_INTERVAL_SECONDS?: number };

export const authModule: FastifyPluginAsync<AuthModuleOptions> = async (app, options) => {
  const sessions = new SessionRepository(app.db);
  const users = new UserRepository(app.db);
  const loginService = new LoginService(users, new SessionService(sessions, options.SESSION_TTL_HOURS));

  registerAuthRoutes(app, loginService, sessions, users, {
    loginRateLimitMax: options.LOGIN_RATE_LIMIT_MAX,
    loginRateLimitTimeWindow: options.LOGIN_RATE_LIMIT_TIME_WINDOW,
    secureCookie: options.NODE_ENV === 'production',
  });
  registerSessionCleanup(app, sessions, options.SESSION_CLEANUP_INTERVAL_SECONDS ?? 3600);
};
