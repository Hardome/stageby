// cspell:ignore unstub
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { type AuthContextValue, AuthProvider } from '@shared/context';
import { readSessionDraft, setSessionOwner, writeSessionDraft } from '@shared/lib';
import { AuthTestProbe } from '@tests/auth-test-probe';

import { getCurrentUserQueryKey } from '@api/queries/useGetCurrentUser';
import type { User } from '@api/types';

const mocks = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock('@api/clients/getCurrentUser', () => ({
  getCurrentUser: () => ({ unwrap: () => mocks.currentUser() as Promise<User> }),
}));

const manager: User = {
  id: 1,
  login: 'manager',
  fullName: 'Руководитель',
  role: 'manager',
  isActive: true,
  phone: null,
  passwordResetRequestedAt: null,
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
};

async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

describe('session lifecycle', () => {
  let root: Root;
  let client: QueryClient;
  let session: AuthContextValue;
  let container: HTMLDivElement;

  beforeEach(async () => {
    sessionStorage.clear();
    setSessionOwner(manager.id);
    mocks.currentUser.mockReset().mockResolvedValue(manager);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(getCurrentUserQueryKey(), manager);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await flush(() =>
      root.render(
        <QueryClientProvider client={client}>
          <AuthProvider>
            <AuthTestProbe
              onSession={(value) => {
                session = value;
              }}
            />
          </AuthProvider>
        </QueryClientProvider>,
      ),
    );
  });

  afterEach(async () => {
    await flush(() => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it('clears protected caches on expiration while retaining the same user draft', async () => {
    client.setQueryData(['private'], { owner: 1 });
    writeSessionDraft('form:1', { title: 'Черновик' });

    await act(async () => {
      await session.clearSession('expired');
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(session.user).toBeNull();
    expect(readSessionDraft('form:1')).toEqual({ title: 'Черновик' });

    await act(async () => {
      await session.clearSession('sign-in', 1);
      client.setQueryData(getCurrentUserQueryKey(), manager);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(readSessionDraft('form:1')).toEqual({ title: 'Черновик' });
    expect(session.user?.id).toBe(1);
  });

  it.each(['logout', 'sign-in'] as const)('removes drafts on %s or account change', async (reason) => {
    writeSessionDraft('form:1', { title: 'Черновик' });

    await act(async () => {
      await session.clearSession(reason, 2);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(readSessionDraft('form:1')).toBeUndefined();
    expect(session.user).toBeNull();
  });

  it('handles 401 from any protected query', async () => {
    writeSessionDraft('form:1', { title: 'Черновик' });

    await act(async () => {
      const error = Object.assign(new Error('Unauthorized'), { status: 401 });
      await expect(
        client.query<User>({ queryKey: ['private'], queryFn: () => Promise.reject(error) }),
      ).rejects.toMatchObject({ status: 401 });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(session.user).toBeNull();
    expect(client.getQueryData(['private'])).toBeUndefined();
    expect(readSessionDraft('form:1')).toEqual({ title: 'Черновик' });
  });

  it('refreshes identity on 403 and drops caches after a role change', async () => {
    mocks.currentUser.mockResolvedValue({ ...manager, role: 'foreman' });
    client.setQueryData(['private'], { owner: 1 });

    await act(async () => {
      const error = Object.assign(new Error('Forbidden'), { status: 403 });
      await expect(
        client.query<User>({ queryKey: ['forbidden'], queryFn: () => Promise.reject(error) }),
      ).rejects.toMatchObject({ status: 403 });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(mocks.currentUser).toHaveBeenCalled();
    expect(session.user?.role).toBe('foreman');
    expect(client.getQueryData(['private'])).toBeUndefined();
  });
});
