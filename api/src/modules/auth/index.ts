import type { FastifyPluginAsync } from 'fastify';

import type { Environment } from '#app/config/env';
import { LoginService } from '#app/modules/auth/login-service';
import { registerAuthRoutes } from '#app/modules/auth/routes';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { UserRepository } from '#app/modules/users/repository';

type AuthModuleOptions = Pick<
  Environment,
  'SESSION_TTL_HOURS' | 'LOGIN_RATE_LIMIT_MAX' | 'LOGIN_RATE_LIMIT_TIME_WINDOW'
>;

export const authModule: FastifyPluginAsync<AuthModuleOptions> = async (app, options) => {
  const sessions = new SessionRepository(app.db);
  const loginService = new LoginService(
    new UserRepository(app.db),
    new SessionService(sessions, options.SESSION_TTL_HOURS),
  );

  registerAuthRoutes(app, loginService, sessions, {
    loginRateLimitMax: options.LOGIN_RATE_LIMIT_MAX,
    loginRateLimitTimeWindow: options.LOGIN_RATE_LIMIT_TIME_WINDOW,
  });
};
