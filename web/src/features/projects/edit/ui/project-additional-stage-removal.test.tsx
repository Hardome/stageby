import { click, fill, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

import type { UpdateProjectOptions } from '@api/types';

describe('removing an unsaved additional stage', () => {
  const mocks = getProjectEditingMocks();
  const context = setupProjectEditing();

  it('removes its values and errors, saves without it and starts empty when added again', async () => {
    await context.render();
    await fill('ownerName', 'Мария');
    await click('Доп. этап');
    await fill('stages.2.plannedWorkAmount', '100');
    await context.submit();

    expect(context.container).toHaveTextContent('Добавьте хотя бы один пункт');

    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Контроль');
    await click('Удалить доп. этап');

    expect(context.container).not.toHaveTextContent('Добавьте хотя бы один пункт');
    expect(context.container.querySelector('h2')).toHaveTextContent('Выбор этапов');

    await context.submit();

    expect(mocks.update).toHaveBeenCalledOnce();
    const request = mocks.update.mock.lastCall?.[0] as UpdateProjectOptions;

    expect(request.body.additionalStage).toBeUndefined();

    await click('Доп. этап');

    expect(context.container.querySelector('input[id$="plannedWorkAmount"]')).toHaveValue('');
    expect(context.container.querySelector('input[id$="checklistItems.0.title"]')).toBeNull();
  });
});
