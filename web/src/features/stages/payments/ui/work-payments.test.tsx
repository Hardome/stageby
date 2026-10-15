// cspell:ignore unstub
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';
import { workPayment, workRow } from '@tests/work-payment-data';

import type { Stage } from '@api/types';

import { WorkPayments } from './work-payments';

const mocks = vi.hoisted(() => ({ rows: vi.fn(), payments: vi.fn(), role: 'manager', user: vi.fn() }));
vi.mock('@shared/context', () => ({ useAuth: () => ({ user: { id: 4, fullName: 'Иван', role: mocks.role } }) }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => vi.fn() }));
vi.mock('@api/queries/useListWorkPlanRows', () => ({ useListWorkPlanRows: mocks.rows }));
vi.mock('@api/queries/useListWorkPayments', () => ({ useListWorkPayments: mocks.payments }));
vi.mock('@api/queries/useGetUser', () => ({ useGetUser: mocks.user }));

describe('work payments access and totals', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.role = 'manager';
    mocks.rows.mockReturnValue({ data: [workRow()] });
    mocks.payments.mockReturnValue({ data: [] });
    mocks.user.mockReturnValue({ data: { id: 8, fullName: 'Пётр', isActive: false } });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(overrides: Partial<Stage> = {}) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <WorkPayments stage={editStage(overrides).stage} />
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });
  }

  function confirm() {
    return [...container.querySelectorAll('button')].find((button) => button.textContent === 'Подтвердить «Выплачен»');
  }

  it('allows distribution and deletion only for an unpaid row without recipient', async () => {
    await render();

    expect(container).toHaveTextContent('Распределить');
    expect(container.querySelector('[aria-label="Удалить строку"]')).toBeInTheDocument();
    expect(
      [...container.querySelectorAll('button')].find((button) => button.textContent === 'Добавить платёж'),
    ).toBeDisabled();

    mocks.rows.mockReturnValue({ data: [workRow({ recipientId: 8 })] });
    mocks.payments.mockReturnValue({ data: [workPayment(), workPayment({ id: 32 })] });
    await render();

    expect(container).toHaveTextContent('Пётр (неактивен)');
    expect(container).toHaveTextContent('Переплата');
    expect(container).not.toHaveTextContent('Удалить строку');
    expect(container).not.toHaveTextContent('Распределить');
  });

  it('preserves a foreman historical payment and labels the partial detail', async () => {
    mocks.role = 'foreman';
    mocks.rows.mockReturnValue({ data: [workRow({ recipientId: 4 })] });
    mocks.payments.mockReturnValue({ data: [workPayment(), workPayment({ id: 32, workPlanRowId: 22 })] });
    await render();

    expect(container).toHaveTextContent('Мои выплаты по строке');
    expect(container).toHaveTextContent('Мои выплаты по недоступным строкам');
    expect(container).not.toHaveTextContent('Остаток строки');
    expect(container).not.toHaveTextContent('Добавить строку');
    expect(container).not.toHaveTextContent('Изменить платёж');
    expect(mocks.user).toHaveBeenLastCalledWith(
      { path: { userId: 4 } },
      {
        query: { enabled: false, retry: false },
      },
    );
  });

  it('requires acceptance and a known settled manual plan for paid confirmation', async () => {
    await render();

    expect(confirm()).toBeDisabled();

    await render({ status: 'completed', plannedWorkAmountMinor: 0n, workBalanceAmountMinor: 0n });
    expect(confirm()).not.toBeDisabled();

    await render({ status: 'completed', plannedWorkAmountMinor: null, workBalanceAmountMinor: null });
    expect(confirm()).toBeDisabled();
  });

  it('hides all editing for archived projects and renders unavailable responses neutrally', async () => {
    await render({ projectIsArchived: true });

    expect(container).not.toHaveTextContent('Добавить строку');
    expect(container).not.toHaveTextContent('Изменить строку');

    mocks.rows.mockReturnValue({ error: { status: 403 } });
    await render();

    expect(container).toHaveTextContent('404 — Страница не найдена');
  });
});
