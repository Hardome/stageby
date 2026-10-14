import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { PasswordResetForm } from './password-reset-form';

const request = vi.hoisted(() => vi.fn());
vi.mock('@api/clients/requestPasswordReset', () => ({
  requestPasswordReset: (...arguments_: unknown[]) => ({ unwrap: () => request(...arguments_) as Promise<unknown> }),
}));

async function flush(action: () => void) {
  await act(async () => {
    action();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('password reset request', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  function loginInput() {
    const input = container.querySelector<HTMLInputElement>('#reset-login');
    if (!input) throw new Error('Missing login input');

    return input;
  }

  async function fill(login: string) {
    await flush(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(loginInput(), login);
      loginInput().dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  async function submit() {
    await flush(() => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    request.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 2 } } });

    await flush(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PasswordResetForm />
        </QueryClientProvider>,
      );
    });
  });

  afterEach(async () => {
    await flush(() => root.unmount());
    queryClient.clear();
    container.remove();
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it.each(['active.user', 'unknown.user', 'disabled.user'])('shows the same acceptance for %s', async (login) => {
    request.mockResolvedValue(undefined);

    await fill(login);
    await submit();

    expect(request).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ body: { login } }));
    expect(container.querySelector('[role=status]')?.textContent).toBe(
      'Запрос принят. Если аккаунт доступен, руководитель назначит новый пароль и передаст его вам вне приложения.',
    );
    expect(container.querySelector('form')).toBeNull();
  });

  it.each(['', 'ab', 'UPPER', 'имя', 'a'.repeat(65)])('rejects invalid login %s before the request', async (login) => {
    await fill(login);
    await submit();

    expect(request).not.toHaveBeenCalled();
    expect(loginInput()).toHaveAttribute('aria-invalid', 'true');
    expect(loginInput()).toHaveAttribute('aria-describedby', 'reset-login-error');
    expect(container.querySelector('#reset-login-error')).not.toBeNull();
  });

  it('blocks concurrent requests while waiting', async () => {
    const response = Promise.withResolvers<unknown>();
    request.mockReturnValue(response.promise);

    await fill('active.user');
    await flush(() => {
      const form = container.querySelector('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await submit();

    expect(request).toHaveBeenCalledTimes(1);
    expect(loginInput()).toBeDisabled();
    expect(container.querySelector('button')).toBeDisabled();

    await flush(() => response.resolve(undefined));

    expect(container.querySelector('[role=status]')).not.toBeNull();
  });

  it.each([
    [undefined, 'Проверьте соединение'],
    [400, 'Проверьте логин'],
    [429, 'Слишком много запросов'],
  ])('retains the login after error %s and allows a manual retry', async (status, message) => {
    request.mockRejectedValueOnce({ status });

    await fill('active.user');
    await submit();

    expect(request).toHaveBeenCalledTimes(1);
    expect(loginInput()).toHaveValue('active.user');
    expect(container.querySelector('[role=alert]')?.textContent).toContain(message);
    expect(container.querySelector('button')).not.toBeDisabled();

    request.mockResolvedValueOnce(undefined);
    await submit();

    expect(request).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role=status]')).not.toBeNull();
  });
});
