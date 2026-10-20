import { editStage } from '@tests/project-edit-fixture';
import { click, fill, input, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

describe('project editing: direct stage switching', () => {
  const context = setupProjectEditing();
  const mocks = getProjectEditingMocks();

  it('opens the requested stage immediately', async () => {
    context.snapshot.stages.push(editStage({ id: 13, type: 'roof', title: 'Крыша', position: 3 }));
    await context.render(13);

    expect(context.container.querySelector('h2')).toHaveTextContent('Крыша');
    expect(input('stages.2.plannedWorkAmount')).toBeInTheDocument();
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
  });

  it.each([999, 12])('opens object fields when stage %s is missing or excluded', async (stageId) => {
    await context.render(stageId);

    expect(context.container.querySelector('h2')).toHaveTextContent('Объект');
  });

  it('switches directly to nonadjacent stages and retains edits and error navigation', async () => {
    context.snapshot.stages.push(editStage({ id: 13, type: 'roof', title: 'Крыша', position: 3 }));
    await context.render();
    await click('Этап 2. Крыша');
    await fill('stages.2.plannedWorkAmount', '350');
    await click('Этап 1. Фундамент');
    await fill('stages.0.checklistItems.0.title', '');
    await click('Этап 2. Крыша');

    expect(input('stages.2.plannedWorkAmount')).toHaveValue('350');
    expect(context.container.querySelector('h2')).toHaveFocus();
    expect(context.container.querySelector('button[aria-label="Этап 1. Фундамент. Есть ошибки"]')).not.toBeNull();

    await context.submit();

    expect(context.container.querySelector('h2')).toHaveTextContent('Фундамент');
    expect(input('stages.0.checklistItems.0.title')).toHaveFocus();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('adds an additional stage and resets it when added again', async () => {
    await context.render();
    await click('Этап 1. Фундамент');
    await click('Доп. этап');
    await fill('stages.2.plannedWorkAmount', '250');
    await click('Этап 1. Фундамент');
    await click('Этап 2. Дополнительный этап');

    expect(input('stages.2.plannedWorkAmount')).toHaveValue('250');

    await click('2. Выбор этапов');
    await click('Включить этап «Дополнительный этап»');

    expect(context.container.querySelector('button[aria-label="Этап 2. Дополнительный этап"]')).toBeNull();

    await click('Этап 1. Фундамент');
    await click('Доп. этап');

    expect(input('stages.2.plannedWorkAmount')).toHaveValue('');
  });
});
