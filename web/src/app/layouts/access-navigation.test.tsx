// cspell:ignore unstub
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { createRoot, type Root } from 'react-dom/client';

import { routeTree } from '@route-tree';
import { AuthProvider } from '@shared/context';

import type { User } from '@api/types';

const mocks = vi.hoisted(() => ({ user: vi.fn(), login: vi.fn(), stage: vi.fn() }));
vi.mock('@api/clients/getCurrentUser', () => ({
  getCurrentUser: () => ({ unwrap: () => mocks.user() as Promise<User> }),
}));
vi.mock('@api/clients/login', () => ({ login: () => ({ unwrap: () => mocks.login() as Promise<unknown> }) }));
vi.mock('@api/clients/getStage', () => ({ getStage: () => ({ unwrap: () => mocks.stage() as Promise<unknown> }) }));
vi.mock('@widgets/app-header', () => ({ AppHeader: () => null }));
vi.mock('../devtools/tanstack-router-devtools', () => ({ RouterDevtools: () => null }));

const manager: User = {
  id: 1,
  login: 'manager',
  fullName: 'Руководитель',
  role: 'manager',
  phone: null,
  isActive: true,
  passwordResetRequestedAt: null,
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
};

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
}

async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

async function submitLogin(container: HTMLDivElement) {
  await flush(() => {
    for (const [id, value] of [
      ['login', 'manager'],
      ['password', 'Example-Only-123'],
    ]) {
      const input = container.querySelector(`#${id}`);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await flush(() =>
    container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
  await settle();
  await settle();
}

describe('protected route navigation', () => {
  let root: Root;
  let client: QueryClient;
  let container: HTMLDivElement;
  let router: ReturnType<typeof createRouter<typeof routeTree>>;

  async function mount(path: string) {
    router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) });
    await flush(() =>
      root.render(
        <QueryClientProvider client={client}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>,
      ),
    );
    await settle();
    await settle();
  }

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('scrollTo', vi.fn());
    mocks.user.mockReset().mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    mocks.login.mockReset();
    mocks.stage.mockReset().mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await flush(() => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each(['manager', 'foreman'] as const)('opens the home for %s after login', async (role) => {
    mocks.user.mockResolvedValue({ ...manager, role });

    await mount('/login');

    expect(router.state.location.pathname).toBe(role === 'manager' ? '/' : '/my-stages');
  });

  it('allows a manager to open the foreman page', async () => {
    mocks.user.mockResolvedValue(manager);

    await mount('/my-stages');

    expect(router.state.location.pathname).toBe('/my-stages');
    expect(container.textContent).toContain('Мои этапы');
    expect(container.textContent).not.toContain('404');
  });

  it.each([403, 404])('uses the same page for stage status %s and an unknown URL', async (status) => {
    mocks.user.mockResolvedValue(manager);
    mocks.stage.mockRejectedValue(Object.assign(new Error('Unavailable'), { status }));

    await mount('/stages/7');

    const unavailable = container.textContent;
    expect(unavailable).toContain('404 — Страница не найдена');

    await act(async () => router.navigate({ href: '/unknown-page' }));
    await settle();

    expect(container.textContent).toBe(unavailable);
  });

  it('retains a protected URL and returns after successful login', async () => {
    await mount('/stages/7?tab=work');

    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toEqual({ returnTo: '/stages/7?tab=work' });

    mocks.user.mockResolvedValue(manager);
    mocks.login.mockResolvedValue({ user: manager });
    await submitLogin(container);

    expect(router.state.location.pathname).toBe('/stages/7');
    expect(router.state.location.search).toEqual({ tab: 'work' });
    expect(container.textContent).toContain('404 — Страница не найдена');
    expect(container.querySelector('a')?.textContent).toBe('На главную');
  });

  it('rejects an external destination and shows denied access after role changes', async () => {
    mocks.user.mockResolvedValue({ ...manager, role: 'foreman' });

    await mount(`/login?returnTo=${encodeURIComponent('https://example.com')}`);

    expect(router.state.location.pathname).toBe('/my-stages');

    await act(async () => router.navigate({ to: '/users' }));
    await settle();

    expect(container.textContent).toContain('404 — Страница не найдена');
  });

  it.each([
    [401, 'Неверный логин или пароль.'],
    [429, 'Слишком много попыток входа. Попробуйте позже.'],
  ])('shows the login error for status %s', async (status, message) => {
    mocks.login.mockRejectedValue(Object.assign(new Error('Login failed'), { status }));
    await mount('/login');

    await submitLogin(container);

    expect(container.textContent).toContain(message);
    expect(router.state.location.pathname).toBe('/login');
    expect(container.querySelector<HTMLInputElement>('#login')?.value).toBe('manager');
  });
});
