import { flushPasswordChange, listKey, mountPasswordChange, resetUser, userKey } from '@tests/password-change-harness';

import type { User } from '@api/types';

const mocks = vi.hoisted(() => ({ setPassword: vi.fn(), getUser: vi.fn(), navigate: vi.fn(), clearSession: vi.fn() }));
vi.mock('@api/clients/setUserPassword', () => ({
  setUserPassword: (...arguments_: unknown[]) => ({
    unwrap: () => mocks.setPassword(...arguments_) as Promise<unknown>,
  }),
}));
vi.mock('@api/clients/getUser', () => ({
  getUser: (...arguments_: unknown[]) => ({ unwrap: () => mocks.getUser(...arguments_) as Promise<unknown> }),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => mocks.navigate,
  Link: 'a',
}));
vi.mock('@shared/context', () => ({
  useAuth: () => ({ user: { id: 1 }, clearSession: mocks.clearSession, refetch: vi.fn() }),
}));
vi.mock('@shared/ui/toast', () => ({ toast: { add: vi.fn() } }));

describe('password change request status', () => {
  let harness: Awaited<ReturnType<typeof mountPasswordChange>>;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue(resetUser);
    harness = await mountPasswordChange();
  });

  afterEach(async () => {
    await harness.cleanup();
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it('keeps the request and password input after a failed change', async () => {
    mocks.setPassword.mockRejectedValueOnce({ status: 500 });

    await harness.fillPassword();
    await harness.submit();

    expect(harness.container.textContent).toContain('Запрошен сброс пароля');
    expect(harness.container.querySelector('#password')).toHaveValue('Example-Only-123');
    expect(harness.queryClient.getQueryData(userKey)).toEqual(resetUser);
    expect(harness.queryClient.getQueryState(listKey)?.isInvalidated).toBe(false);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('refreshes server data before navigation and removes the closed request', async () => {
    const response = Promise.withResolvers<User>();
    mocks.setPassword.mockResolvedValueOnce(undefined);
    mocks.getUser.mockReturnValueOnce(response.promise);

    await harness.fillPassword();
    await harness.submit();

    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(harness.container.textContent).toContain('Запрошен сброс пароля');

    const updated = { ...resetUser, passwordResetRequestedAt: null };
    await flushPasswordChange(() => response.resolve(updated));

    expect(harness.queryClient.getQueryData(userKey)).toEqual(updated);
    expect(harness.queryClient.getQueryState(listKey)?.isInvalidated).toBe(true);
    expect(harness.container.textContent).not.toContain('Запрошен сброс пароля');
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/users', search: {} });
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it('retains the mark if the server still reports an open request', async () => {
    mocks.setPassword.mockResolvedValueOnce(undefined);

    await harness.fillPassword();
    await harness.submit();

    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    expect(harness.container.textContent).toContain('Запрошен сброс пароля');
    expect(harness.queryClient.getQueryData(userKey)).toEqual(resetUser);
  });
});
