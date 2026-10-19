// cspell:ignore unstub
import { act } from 'react';

import { dashboardProject } from '@tests/dashboard-fixture';

import { mocks, setupTest } from './dashboard-test-setup';

describe('manager dashboard', () => {
  const context = setupTest();
  const { render } = context;

  it('uses the same server stage for all action links until the server changes it', async () => {
    await render();

    const links = () => [...context.container.querySelectorAll(':scope tbody a[target="_blank"]')];
    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      '/stages/11?tab=materials',
      '/stages/11?tab=checklist#parameters',
      '/stages/11?tab=checklist',
    ]);
    expect(context.container.querySelector('[data-variant="warning"]')).toHaveTextContent('До старта ≤ 7 дней');
    expect(context.container.querySelector('[data-variant="warning"]')?.closest('a')).toBeNull();
    expect(context.container.querySelector('[data-variant="caution"]')).not.toBeNull();
    const cards = context.container.querySelector('[aria-label="Карточки объектов"]');
    expect(cards).toHaveTextContent('Фундамент');
    expect(cards?.querySelectorAll('a[target="_blank"]')).toHaveLength(3);

    mocks.projects.mockReturnValue({
      data: {
        items: [{ ...dashboardProject, selectedStage: { ...dashboardProject.selectedStage, stageId: 12 } }],
        total: 1,
      },
    });
    await render();

    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      '/stages/12?tab=materials',
      '/stages/12?tab=checklist#parameters',
      '/stages/12?tab=checklist',
    ]);
    expect([...(cards?.querySelectorAll('a[target="_blank"]') ?? [])].map((link) => link.getAttribute('href'))).toEqual(
      ['/stages/12?tab=checklist', '/stages/12?tab=materials', '/stages/12?tab=checklist#parameters'],
    );
  });

  it('omits the warning without a start and all stage actions for completed projects', async () => {
    mocks.projects.mockReturnValue({
      data: {
        items: [
          { ...dashboardProject, selectedStage: { ...dashboardProject.selectedStage, plannedStartDate: null } },
          { ...dashboardProject, projectId: 8, status: 'completed', selectedStage: null },
        ],
        total: 2,
      },
    });
    await render();

    expect(context.container).not.toHaveTextContent('До старта ≤ 7 дней');
    expect(context.container.querySelectorAll(':scope tbody tr:last-child a')).toHaveLength(1);
    expect(context.container.querySelector(':scope tbody tr:last-child')).toHaveTextContent('Выполнен');
  });

  it('preserves server order, paginates and disables navigation during refresh', async () => {
    await render();
    const next = context.container.querySelector(':scope nav button:last-child') as HTMLButtonElement;

    await act(async () => {
      next.click();
      await Promise.resolve();
    });
    expect(mocks.page).toHaveBeenCalledWith(20);

    mocks.projects.mockReturnValue({ data: { items: [dashboardProject], total: 21 }, isFetching: true });
    await render();

    expect(next).toBeDisabled();
    expect(context.container).toHaveTextContent('Обновляем объекты…');

    mocks.projects.mockReturnValue({ data: { items: [], total: 21 }, isFetching: false });
    await render('2026-10-04', 60);

    expect(mocks.page).toHaveBeenCalledWith(20, true);
  });
});
