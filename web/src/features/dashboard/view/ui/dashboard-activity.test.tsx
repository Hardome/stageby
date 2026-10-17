import { act } from 'react';

import { dashboardProject, dashboardSummary } from '@tests/dashboard-fixture';

import { mocks, setupTest } from './dashboard-test-setup';

describe('dashboard activity query states', () => {
  const context = setupTest();
  const { render } = context;

  beforeEach(() => {
    mocks.summary.mockReturnValue({ data: { ...dashboardSummary, activeProjectCount: 0 } });
  });

  it('shows loading while the project count is unknown and resolves to an empty description', async () => {
    mocks.projects.mockReturnValue({ isLoading: true, isFetching: true });

    await render();

    const summary = context.container.querySelector('[aria-label="Финансовая сводка"]');
    expect(summary?.querySelector('[aria-label="Загрузка состояния объектов"]')).not.toBeNull();
    expect(summary).not.toHaveTextContent('Все этапы выплачены');

    mocks.projects.mockReturnValue({ data: { items: [], total: 0 } });
    await render();

    expect(summary?.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(summary).not.toHaveTextContent('Все этапы выплачены');
  });

  it('reports a project count failure, handles access and retries independently', async () => {
    const error = { status: 500 };
    mocks.projects.mockReturnValue({ error, refetch: mocks.retry });

    await render();

    const summary = context.container.querySelector('[aria-label="Финансовая сводка"]');
    expect(summary).toHaveTextContent('Не удалось загрузить состояние объектов.');
    expect(summary).not.toHaveTextContent('Все этапы выплачены');
    expect(mocks.access).toHaveBeenCalledWith(error);

    await act(async () => {
      summary?.querySelector<HTMLButtonElement>('button')?.click();
      await Promise.resolve();
    });

    expect(mocks.retry).toHaveBeenCalledOnce();
  });

  it.each([403, 404])('hides the summary on project count access error %s with cached data', async (status) => {
    mocks.projects.mockReturnValue({ data: { items: [dashboardProject], total: 1 }, error: { status } });

    await render();

    expect(context.container.querySelector('[aria-label="Финансовая сводка"]')).toBeNull();
    expect(context.container).not.toHaveTextContent('Все этапы выплачены');
    expect(context.container).toHaveTextContent('404 — Страница не найдена');
  });
});
