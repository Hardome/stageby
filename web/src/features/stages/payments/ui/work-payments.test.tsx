// cspell:ignore unstub
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';
import { workPayment } from '@tests/work-payment-data';

import type { Stage } from '@api/types';

import { WorkPayments } from './work-payments';

const mocks = vi.hoisted(() => ({ rows: vi.fn(), payments: vi.fn(), role: 'manager', user: vi.fn() }));
vi.mock('@shared/context', () => ({ useAuth: () => ({ user: { id: 4, fullName: 'Иван', role: mocks.role } }) }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => vi.fn() }));
vi.mock('@api/queries/useListWorkPayments', () => ({ useListWorkPayments: mocks.payments }));
vi.mock('@api/queries/useGetUser', () => ({ useGetUser: mocks.user }));

describe('work payments access and totals', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.role = 'manager';
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

  it('adds payments only with an active assignee and has no manual paid action', async () => {
    await render();
    expect(
      [...container.querySelectorAll('button')].find((button) => button.textContent === 'Добавить выплату'),
    ).not.toBeDisabled();
    expect(container).not.toHaveTextContent('Подтвердить «Выплачен»');
    expect(container).not.toHaveTextContent('Распределить');
    await render({ assignee: null });
    expect(
      [...container.querySelectorAll('button')].find((button) => button.textContent === 'Добавить выплату'),
    ).toBeDisabled();
    expect(container).toHaveTextContent('назначьте активного мастера');
    await render({ assignee: { id: 8, fullName: 'Пётр', phone: null, isActive: false } });
    expect(
      [...container.querySelectorAll('button')].find((button) => button.textContent === 'Добавить выплату'),
    ).toBeDisabled();
  });

  it('shows the foreman payments as one list without editing controls', async () => {
    mocks.role = 'foreman';
    mocks.payments.mockReturnValue({ data: [workPayment(), workPayment({ id: 32 })] });
    await render();
    expect(container).not.toHaveTextContent('Ваши выплаты за работы');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('[aria-label="Изменить платёж"]')).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent('Добавить выплату');
    expect(container).not.toHaveTextContent('Аванс');
  });

  it('shows payment comments to the manager even for archived projects', async () => {
    mocks.payments.mockReturnValue({ data: [workPayment()] });
    await render({ projectIsArchived: true });
    expect(container).toHaveTextContent('Аванс');
  });

  it('hides all editing for archived projects and renders unavailable responses neutrally', async () => {
    await render({ projectIsArchived: true });

    expect(container.querySelector('[aria-label="Изменить платёж"]')).not.toBeInTheDocument();

    mocks.payments.mockReturnValue({ error: { status: 403 } });
    await render();

    expect(container).toHaveTextContent('404 — Страница не найдена');
  });
});
