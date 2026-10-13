import { editSnapshot } from '@tests/project-edit-fixture';
import { click, fill, flush, input, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

import { getProjectQueryKey } from '@api/queries/useGetProject';
import { getProjectEditQueryKey } from '@api/queries/useGetProjectEdit';
import { listProjectsQueryKey } from '@api/queries/useListProjects';
import type { ProjectEdit, UpdateProjectOptions } from '@api/types';

describe('project editing: saving', () => {
  const mocks = getProjectEditingMocks();
  const context = setupProjectEditing();
  const { submit, render } = context;

  it('loads a fresh snapshot on reentry even when the cached snapshot is still fresh', async () => {
    context.client.setDefaultOptions({ queries: { retry: false, staleTime: Infinity } });

    await render();
    await flush(() => context.root.render(null));

    const pending = Promise.withResolvers<ProjectEdit>();
    mocks.load.mockReturnValueOnce(pending.promise);

    await render();

    expect(context.container.querySelector('form')).toBeNull();
    expect(context.container.querySelector('[aria-label="Загрузка редактора объекта"]')).not.toBeNull();

    const latest = editSnapshot();
    latest.project.ownerName = 'Мария';
    latest.project.version = 9;

    await flush(() => pending.resolve(latest));
    await vi.waitFor(() => expect(input('ownerName')).toHaveValue('Мария'));
    await fill('ownerName', 'Ольга');
    await submit();

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ body: { expectedVersion: 9, ownerName: 'Ольга' } }),
    );
  });

  it('does not open a cached form after the initial refresh fails and allows retrying', async () => {
    context.client.setQueryData(getProjectEditQueryKey({ path: { projectId: 1 } }), context.snapshot);
    mocks.load.mockRejectedValueOnce({ status: 500, data: {} });

    await render();

    expect(context.container.querySelector('form')).toBeNull();
    expect(context.container).toHaveTextContent('Не удалось загрузить объект.');

    const latest = editSnapshot();
    latest.project.isArchived = true;
    mocks.load.mockResolvedValueOnce(latest);

    await click('Повторить загрузку');
    await vi.waitFor(() => expect(context.container).toHaveTextContent('Объект в архиве'));

    expect(context.container.querySelector('form')).toBeNull();
  });

  it('closes an unchanged form without sending a PATCH', async () => {
    await render();
    await submit();

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith(false);
    expect(context.container).not.toHaveTextContent('Проверьте отмеченные поля');
  });

  it('closes without a PATCH when edited values normalize to the original values', async () => {
    await render();
    await fill('ownerName', 'Мария');
    await fill('ownerName', ' Анна ');
    await fill('coordinates', '56.0,60.00');

    expect(mocks.dirty).toHaveBeenLastCalledWith(true);

    await submit();

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('prefills the form, preserves edits across background refresh and saves a partial PATCH', async () => {
    await render();

    expect(input('ownerName')).toHaveValue('Анна');
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);

    await fill('ownerName', 'Мария');

    const latest = editSnapshot();
    latest.project.ownerName = 'Server change';

    await flush(() => context.client.setQueryData(getProjectEditQueryKey({ path: { projectId: 1 } }), latest));

    expect(input('ownerName')).toHaveValue('Мария');

    context.client.setQueryData(listProjectsQueryKey(), { items: [] });

    await submit();

    const options = mocks.update.mock.calls[0]?.[0] as UpdateProjectOptions;

    expect(options).toMatchObject({ path: { projectId: 1 }, body: { expectedVersion: 7, ownerName: 'Мария' } });
    expect(options.body).not.toHaveProperty('stages');
    expect(context.client.getQueryData(getProjectQueryKey({ path: { projectId: 1 } }))).toMatchObject({
      id: 1,
      version: 8,
    });
    expect(context.client.getQueryState(listProjectsQueryKey())?.isInvalidated).toBe(true);
    expect(mocks.success).toHaveBeenCalledOnce();
  });

  it('disables archived objects and distinguishes a missing object from loading', async () => {
    context.snapshot.project.isArchived = true;

    await render();

    expect(context.container).toHaveTextContent('Объект в архиве');
    expect(context.container.querySelector('form')).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('prevents simultaneous submissions and keeps controls locked until completion', async () => {
    await render();
    await fill('ownerName', 'Мария');

    const pending = Promise.withResolvers<ProjectEdit['project']>();
    mocks.update.mockReturnValueOnce(pending.promise);

    await submit();
    await submit();

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(input('ownerName')).toBeDisabled();
    expect(context.container.querySelector('button[type="submit"]')).toBeDisabled();

    await flush(() => pending.resolve({ ...context.snapshot.project, version: 8 }));

    expect(mocks.success).toHaveBeenCalledOnce();
  });
});
