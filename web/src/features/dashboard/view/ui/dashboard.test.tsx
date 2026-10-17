// cspell:ignore unstub
import { act } from 'react';

import { keepPreviousData } from '@tanstack/react-query';

import { dashboardSummary } from '@tests/dashboard-fixture';

import { mocks, setupTest } from './dashboard-test-setup';

describe('manager dashboard', () => {
  const context = setupTest();
  const { render } = context;

  it('disables invalid calculations while keeping projects available', async () => {
    await render('2026-11-04');

    expect(mocks.summary).toHaveBeenCalledWith(expect.anything(), {
      query: { enabled: false, retry: false, placeholderData: keepPreviousData },
    });
    expect(context.container).toHaveTextContent('Расчёт недоступен');
    expect(context.container).toHaveTextContent('Анна');
  });

  it('distinguishes unknown plans, zero and overpayment using server metrics', async () => {
    await render();

    expect(context.container).toHaveTextContent('Не задан');
    expect(context.container).toHaveTextContent('Не рассчитан');
    expect(context.container).toHaveTextContent('Переплата20 ₽');
    expect(context.container).toHaveTextContent('0 ₽');
  });

  it('updates activity descriptions when there are no active projects', async () => {
    await render();
    expect(context.container).toHaveTextContent('Есть этапы, которые ещё не выплачены');
    expect(context.container).toHaveTextContent('В работе до полной выплаты');

    mocks.summary.mockReturnValue({ data: { ...dashboardSummary, activeProjectCount: 0 } });
    await render();

    expect(context.container).toHaveTextContent('Все этапы выплачены');
    expect(context.container).not.toHaveTextContent('Новые объекты появятся здесь');
    expect(context.container).not.toHaveTextContent('Есть этапы, которые ещё не выплачены');
    expect(context.container).not.toHaveTextContent('В работе до полной выплаты');

    mocks.projects.mockReturnValue({ data: { items: [], total: 0 } });
    await render();
    expect(context.container).not.toHaveTextContent('Все этапы выплачены');
    expect(context.container).not.toHaveTextContent('Есть этапы, которые ещё не выплачены');
  });

  it('keeps the summary mounted with its response date while another date loads', async () => {
    await render();
    const summary = context.container.querySelector('[aria-label="Финансовая сводка"]');
    const card = summary?.querySelector('dl');
    mocks.summary.mockReturnValue({
      data: dashboardSummary,
      isLoading: false,
      isFetching: true,
      isPlaceholderData: true,
    });

    await render('2026-10-05');

    expect(summary?.querySelector('dl')).toBe(card);
    expect(card?.closest('[inert]')).not.toBeNull();
    expect(summary).toHaveTextContent('К 04.10.2026');
    expect(summary).not.toHaveTextContent('К 05.10.2026');
    expect(summary?.querySelector('[data-slot="skeleton"]')).toBeNull();

    mocks.summary.mockReturnValue({ data: { ...dashboardSummary, through: '2026-10-05' } });
    await render('2026-10-05');
    expect(summary?.querySelector('dl')).toBe(card);
    expect(summary?.querySelector('[inert]')).toBeNull();
    expect(summary).toHaveTextContent('К 05.10.2026');
  });

  it('isolates errors in each direction and retries', async () => {
    mocks.summary.mockReturnValue({ error: { status: 500 }, refetch: mocks.retry });
    await render();

    expect(context.container).toHaveTextContent('Анна');
    await act(async () => {
      await Promise.resolve();

      return context.container.querySelector('button')?.click();
    });
    expect(mocks.retry).toHaveBeenCalledOnce();

    mocks.summary.mockReturnValue({ data: dashboardSummary });
    mocks.projects.mockReturnValue({ error: { status: 500 }, refetch: mocks.retry });
    await render();

    expect(context.container).toHaveTextContent('Активных объектов1');
    expect(context.container).toHaveTextContent('Не удалось загрузить объекты.');
  });
});
