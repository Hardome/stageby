import { click, fill, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

import { getDashboardSummaryQueryKey } from '@api/queries/useGetDashboardSummary';
import { getProjectQueryKey } from '@api/queries/useGetProject';
import { getProjectEditQueryKey } from '@api/queries/useGetProjectEdit';
import { getStageChecklistQueryKey } from '@api/queries/useGetStageChecklist';
import { listDashboardProjectsQueryKey } from '@api/queries/useListDashboardProjects';
import { listProjectStagesQueryKey } from '@api/queries/useListProjectStages';
import { listProjectsQueryKey } from '@api/queries/useListProjects';
import { listStagesQueryKey } from '@api/queries/useListStages';

describe('additional stage cache', () => {
  const mocks = getProjectEditingMocks();
  const context = setupProjectEditing();

  it('updates the project and invalidates affected data before finishing the edit', async () => {
    await context.render();
    await click('Далее');
    await click('Заполнить этапы');
    await click('Добавить дополнительный этап');
    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Контроль');

    const keys = [
      getProjectEditQueryKey({ path: { projectId: 1 } }),
      listProjectsQueryKey(),
      listStagesQueryKey(),
      listProjectStagesQueryKey({ path: { projectId: 1 } }),
      getDashboardSummaryQueryKey(),
      listDashboardProjectsQueryKey(),
      getStageChecklistQueryKey({ path: { stageId: 11 } }),
      getStageChecklistQueryKey({ path: { stageId: 12 } }),
    ];
    const invalidate = vi.spyOn(context.client, 'invalidateQueries');
    for (const queryKey of keys.slice(1)) context.client.setQueryData(queryKey, {});
    mocks.success.mockImplementationOnce(() => {
      expect(context.client.getQueryData(getProjectQueryKey({ path: { projectId: 1 } }))).toMatchObject({
        id: 1,
        version: 8,
      });
      for (const queryKey of keys) expect(invalidate).toHaveBeenCalledWith({ queryKey });
      for (const queryKey of keys.slice(1)) expect(context.client.getQueryState(queryKey)?.isInvalidated).toBe(true);
    });

    await context.submit();

    expect(mocks.success).toHaveBeenCalledOnce();
  });
});
