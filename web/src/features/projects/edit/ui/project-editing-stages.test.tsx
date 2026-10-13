import { editStage } from '@tests/project-edit-fixture';
import { click, fill, flush, input, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

import type { UpdateProjectOptions } from '@api/types';

describe('project editing: stages', () => {
  const mocks = getProjectEditingMocks();
  const context = setupProjectEditing();
  const { submit, render } = context;

  it('restores excluded stages and keeps edited values across steps', async () => {
    await render();
    await click('Далее');

    expect(context.container.querySelector('#include-foundation')).toBeDisabled();

    const wallsCard = context.container.querySelector<HTMLLabelElement>('label[for="include-walls"]');
    if (!wallsCard) throw new Error('Missing stage card');

    await flush(() => wallsCard.click());

    expect(context.container.querySelector('#include-walls')).toBeChecked();

    await flush(() => wallsCard.click());

    expect(context.container.querySelector('#include-walls')).not.toBeChecked();

    const foundationCard = context.container.querySelector<HTMLLabelElement>('label[for="include-foundation"]');

    await flush(() => foundationCard?.click());

    expect(context.container.querySelector('#include-foundation')).toBeChecked();

    await click('Включить этап «Стены»');

    expect(context.container.querySelector('#include-walls')).toBeChecked();
    expect(context.container.querySelector('#include-foundation')).not.toBeDisabled();

    await click('Заполнить этапы');
    await fill('stages.0.plannedWorkAmount', '0');
    await click('Следующий этап');

    expect(input('stages.1.checklistItems.0.title')).toHaveValue('Армирование');

    await click('Назад');

    expect(input('stages.0.plannedWorkAmount')).toHaveValue('0');

    await submit();

    const options = mocks.update.mock.calls[0]?.[0] as UpdateProjectOptions;

    expect(options.body.stages).toEqual([
      { id: 11, expectedVersion: 3, plannedWorkAmountMinor: 0n },
      { id: 12, expectedVersion: 3, isIncluded: true },
    ]);
  });

  it('shows started checklists read only and keeps stage plans editable', async () => {
    context.snapshot.stages[0] = editStage({ actualStartDate: '2026-10-05', status: 'in_progress' });

    await render();
    await click('Далее');

    expect(context.container).toHaveTextContent('Этап фактически начат');

    await click('Заполнить этапы');

    expect(input('stages.0.checklistItems.0.title')).toBeDisabled();
    expect(input('stages.0.plannedWorkAmount')).not.toBeDisabled();
    expect(context.container).not.toHaveTextContent('Добавить пункт');
  });

  it('reorders checklist items and rejects an empty included checklist', async () => {
    await render();
    await click('Далее');
    await click('Заполнить этапы');
    await click('Добавить пункт');
    await fill('stages.0.checklistItems.1.title', 'Проверить стены');
    await click('Поднять пункт 2');

    expect(input('stages.0.checklistItems.0.title')).toHaveValue('Проверить стены');

    await click('Удалить пункт 2');
    await click('Удалить пункт 1');
    await submit();

    expect(context.container).toHaveTextContent('Добавьте хотя бы один пункт');
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
