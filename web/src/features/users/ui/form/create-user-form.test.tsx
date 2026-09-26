import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { loadCreateDraft, saveCreateDraft } from '../../lib/create-draft';
import { CreateUserForm } from './create-user-form';

const mocks = vi.hoisted(() => ({ request: vi.fn(), finish: vi.fn(), notifyError: vi.fn() }));
vi.mock('@api/clients/createUser', () => ({
  createUser: (...arguments_: unknown[]) => ({ unwrap: () => mocks.request(...arguments_) as Promise<unknown> }),
}));
vi.mock('../../lib/use-user-actions', () => ({
  useUserActions: () => ({ finish: mocks.finish }),
  useUserAccessError: () => {},
  notifyUserError: mocks.notifyError,
  userErrorMessage: () => 'Этот логин уже занят.',
}));
vi.mock('./form-actions', () => ({
  FormActions: ({ pending, disabled, label }: { pending: boolean; disabled: boolean; label: string }) => (
    <button type="submit" disabled={pending || disabled}>
      {label}
    </button>
  ),
}));

async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

describe('creation form draft lifecycle', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  async function mount() {
    root = createRoot(container);
    await flush(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <CreateUserForm managerId={1} search={{}} />
        </QueryClientProvider>,
      );
    });
  }

  function input(id: string): HTMLInputElement {
    const element = container.querySelector<HTMLInputElement>(`#${id}`);
    if (!element) throw new Error(`Missing input: ${id}`);
    return element;
  }

  async function fill(id: string, value: string) {
    await flush(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input(id), value);
      input(id).dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  async function submit() {
    await flush(() => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    sessionStorage.clear();
    mocks.request.mockReset();
    mocks.finish.mockReset();
    mocks.notifyError.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  });
  afterEach(async () => {
    await flush(() => root.unmount());
    queryClient.clear();
    container.remove();
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it('saves typed values and restores them after remount without passwords', async () => {
    await mount();
    await fill('full-name', 'Незаконченное имя');
    await fill('user-login', 'a');
    await fill('phone', '+7');
    await fill('password', 'Example-Only-123');
    expect(loadCreateDraft(1)).toMatchObject({ fullName: 'Незаконченное имя', login: 'a', phone: '+7' });
    await flush(() => root.unmount());
    await mount();
    expect(input('full-name').value).toBe('Незаконченное имя');
    expect(input('user-login').value).toBe('a');
    expect(input('password').value).toBe('');
    expect(input('confirm-password').value).toBe('');
  });

  it('clears both storage and fields when discarding the draft', async () => {
    saveCreateDraft(1, { fullName: 'Имя', login: 'draft.user', phone: '', role: 'foreman' });
    await mount();
    await fill('password', 'Example-Only-123');
    const button = [...container.querySelectorAll('button')].find(
      (element) => element.textContent === 'Очистить черновик',
    );
    await flush(() => button?.click());
    expect(input('full-name').value).toBe('');
    expect(input('password').value).toBe('');
    expect(sessionStorage.getItem('stageby:draft:create-user:v1:1')).toBeNull();
  });

  it('retains a failed submission and removes the draft only after success', async () => {
    saveCreateDraft(1, { fullName: 'Имя', login: 'draft.user', phone: '', role: 'foreman' });
    mocks.request.mockRejectedValueOnce({ status: 409, data: { code: 'login_taken' } });
    await mount();
    await fill('password', 'Example-Only-123');
    await fill('confirm-password', 'Example-Only-123');
    await submit();
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { fullName: 'Имя', login: 'draft.user', phone: null, role: 'foreman', password: 'Example-Only-123' },
      }),
    );
    expect(loadCreateDraft(1).login).toBe('draft.user');
    expect(mocks.finish).not.toHaveBeenCalled();
    expect(mocks.notifyError).not.toHaveBeenCalled();
    const user = { id: 2, fullName: 'Имя', login: 'draft.user2', role: 'foreman', phone: null, isActive: true };
    mocks.request.mockResolvedValueOnce(user);
    await fill('user-login', 'draft.user2');
    await submit();
    expect(mocks.finish).toHaveBeenCalledWith('created', user);
    expect(sessionStorage.getItem('stageby:draft:create-user:v1:1')).toBeNull();
  });
});
