import { editStage } from '@tests/project-edit-fixture';
import { click, fill, flush, input, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

import type { UpdateProjectOptions } from '@api/types';

describe('project additional stage', () => {
  const mocks = getProjectEditingMocks();
  const context = setupProjectEditing();

  it('adds a single stage on the last screen of a completed project and saves all edits together', async () => {
    context.snapshot.project.status = 'completed';
    await context.render();
    await fill('ownerName', 'Мария');

    expect(context.container).not.toHaveTextContent('Добавить дополнительный этап');

    await click('Далее');
    await click('Заполнить этапы');
    await fill('stages.0.plannedWorkAmount', '200');
    await click('Добавить дополнительный этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Дополнительный этап');
    expect(context.container.querySelector('input[id$="checklistItems.0.title"]')).toBeNull();
    expect(context.container).not.toHaveTextContent('Добавить дополнительный этап');
    expect(context.container.querySelector('input[id$="title"]')).toBeNull();

    await context.submit();

    expect(context.container).toHaveTextContent('Добавьте хотя бы один пункт');
    expect(mocks.update).not.toHaveBeenCalled();

    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Контроль');
    await fill('stages.2.plannedMaterialAmount', '0');
    await click('Назад');

    expect(input('stages.0.plannedWorkAmount')).toHaveValue('200');
    expect(context.container).not.toHaveTextContent('Добавить дополнительный этап');

    await click('Следующий этап');

    expect(input('stages.2.checklistItems.0.title')).toHaveValue('Контроль');

    await context.submit();

    const options = mocks.update.mock.calls[0]?.[0] as UpdateProjectOptions;

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(options.body).toMatchObject({
      expectedVersion: 7,
      ownerName: 'Мария',
      stages: [{ id: 11, expectedVersion: 3, plannedWorkAmountMinor: 20000n }],
      additionalStage: { plannedMaterialAmountMinor: 0n, checklistItems: [{ title: 'Контроль', photoHint: null }] },
    });
    expect(mocks.success).toHaveBeenCalledOnce();
  });

  it('restores an excluded additional stage by ID with its previous values', async () => {
    context.snapshot.stages.push(
      editStage({ id: 19, type: 'additional', title: 'Дополнительный этап', isIncluded: false }),
    );
    await context.render();
    await click('Далее');
    await click('Заполнить этапы');
    await click('Восстановить дополнительный этап');

    expect(input('stages.2.checklistItems.0.title')).toHaveValue('Армирование');
    expect(input('stages.2.plannedWorkAmount')).toHaveValue('100');
    expect(context.container).not.toHaveTextContent('Восстановить дополнительный этап');

    await context.submit();

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { expectedVersion: 7, stages: [{ id: 19, expectedVersion: 3, isIncluded: true }] },
      }),
    );
  });

  it('does not offer adding a second included additional stage', async () => {
    context.snapshot.stages.push(editStage({ id: 19, type: 'additional', title: 'Дополнительный этап' }));
    await context.render();
    await click('Далее');
    await click('Заполнить этапы');

    expect(context.container).not.toHaveTextContent('Добавить дополнительный этап');

    await click('Следующий этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Дополнительный этап');
    expect(context.container).not.toHaveTextContent('Добавить дополнительный этап');
    expect(context.container).not.toHaveTextContent('Восстановить дополнительный этап');
  });

  it('keeps a new excluded stage as a draft and reuses it when restored', async () => {
    await context.render();
    await click('Далее');
    await click('Заполнить этапы');
    await click('Добавить дополнительный этап');
    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Контроль');
    await click('Назад');
    await click('Назад');
    await click('Включить этап «Дополнительный этап»');

    await context.submit();

    expect(mocks.update).not.toHaveBeenCalled();

    await click('Заполнить этапы');
    await click('Восстановить дополнительный этап');

    expect(input('stages.2.checklistItems.0.title')).toHaveValue('Контроль');

    const pending = Promise.withResolvers<typeof context.snapshot.project>();
    mocks.update.mockReturnValueOnce(pending.promise);
    await context.submit();
    await context.submit();

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(input('stages.2.checklistItems.0.title')).toBeDisabled();

    await flush(() => pending.resolve({ ...context.snapshot.project, version: 8 }));

    expect(mocks.success).toHaveBeenCalled();
  });
});
