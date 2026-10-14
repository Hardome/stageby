import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';

import { UserEditor } from '@features/users';

import { getUserQueryKey } from '@api/queries/useGetUser';
import { listUsersQueryKey } from '@api/queries/useListUsers';
import type { User } from '@api/types';

export const resetUser: User = {
  id: 2,
  login: 'foreman.test',
  fullName: 'Мастер',
  role: 'foreman',
  phone: null,
  isActive: true,
  passwordResetRequestedAt: '2026-10-14T08:00:00Z',
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-14T08:00:00Z',
};

export const userKey = getUserQueryKey({ path: { userId: resetUser.id } });
export const listKey = listUsersQueryKey();

export async function flushPasswordChange(action: () => void) {
  await act(async () => {
    action();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export async function mountPasswordChange() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(userKey, resetUser);
  queryClient.setQueryData(listKey, { items: [resetUser], total: 1 });

  await flushPasswordChange(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <UserEditor userId="2" search={{}} mode="password" />
      </QueryClientProvider>,
    );
  });

  async function fillPassword() {
    await flushPasswordChange(() => {
      for (const id of ['password', 'confirm-password']) {
        const input = container.querySelector<HTMLInputElement>(`#${id}`);
        if (!input) throw new Error(`Missing input: ${id}`);

        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'Example-Only-123');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  async function submit() {
    await flushPasswordChange(() => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }

  async function cleanup() {
    await flushPasswordChange(() => root.unmount());
    queryClient.clear();
    container.remove();
  }

  return { container, queryClient, fillPassword, submit, cleanup };
}
