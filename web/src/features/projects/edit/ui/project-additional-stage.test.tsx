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

    expect(context.container).toHaveTextContent('Доп. этап');

    await click('Далее');
    expect(context.container).toHaveTextContent('Доп. этап');
    await click('Заполнить этапы');
    await fill('stages.0.plannedWorkAmount', '200');
    await click('Доп. этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Дополнительный этап');
    expect(context.container.querySelector('input[id$="checklistItems.0.title"]')).toBeNull();
    expect(context.container).not.toHaveTextContent('Доп. этап');
    expect(context.container.querySelector('input[id$="title"]')).toBeNull();

    await context.submit();

    expect(context.container).toHaveTextContent('Добавьте хотя бы один пункт');
    expect(mocks.update).not.toHaveBeenCalled();

    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Контроль');
    await fill('stages.2.plannedMaterialAmount', '0');
    await click('Назад');

    expect(input('stages.0.plannedWorkAmount')).toHaveValue('200');
    expect(context.container).not.toHaveTextContent('Доп. этап');

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

  it('adds a stage directly from project details', async () => {
    await context.render();
    await click('Доп. этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Дополнительный этап');
    expect(context.container).not.toHaveTextContent('Доп. этап');
  });

  it('starts an excluded additional stage with empty values', async () => {
    context.snapshot.stages.push(
      editStage({ id: 19, type: 'additional', title: 'Дополнительный этап', isIncluded: false }),
    );
    await context.render();
    await click('Далее');
    await click('Заполнить этапы');
    await click('Доп. этап');

    expect(context.container.querySelector('input[id$="checklistItems.0.title"]')).toBeNull();
    expect(input('stages.2.plannedWorkAmount')).toHaveValue('');
    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Новая проверка');

    await context.submit();

    const request = mocks.update.mock.calls[0]?.[0] as UpdateProjectOptions;

    expect(request.body.stages?.[0]).toMatchObject({
      id: 19,
      expectedVersion: 3,
      isIncluded: true,
      plannedWorkAmountMinor: null,
      checklist: { expectedVersion: 5, items: [{ title: 'Новая проверка', photoHint: null }] },
    });
  });

  it('does not offer adding a second included additional stage', async () => {
    context.snapshot.stages.push(editStage({ id: 19, type: 'additional', title: 'Дополнительный этап' }));
    await context.render();
    await click('Далее');
    await click('Заполнить этапы');

    expect(context.container).not.toHaveTextContent('Доп. этап');

    await click('Следующий этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Дополнительный этап');
    expect(context.container).not.toHaveTextContent('Доп. этап');
    expect(context.container).not.toHaveTextContent('Доп. этап');
  });

  it('resets a new excluded stage before adding it again', async () => {
    await context.render();
    await click('Далее');
    await click('Заполнить этапы');
    await click('Доп. этап');
    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Контроль');
    await click('Назад');
    await click('Назад');
    await click('Включить этап «Дополнительный этап»');

    await context.submit();

    expect(mocks.update).not.toHaveBeenCalled();

    await click('Заполнить этапы');
    await click('Доп. этап');

    expect(context.container.querySelector('input[id$="checklistItems.0.title"]')).toBeNull();
    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Повторная проверка');

    const pending = Promise.withResolvers<typeof context.snapshot.project>();
    mocks.update.mockReturnValueOnce(pending.promise);
    await context.submit();
    await context.submit();

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(input('stages.2.checklistItems.0.title')).toHaveValue('Повторная проверка');
    expect(input('stages.2.checklistItems.0.title')).toBeDisabled();

    await flush(() => pending.resolve({ ...context.snapshot.project, version: 8 }));

    expect(mocks.success).toHaveBeenCalled();
  });
});
