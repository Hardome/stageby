import { flush, setupProjectCreation, types } from '@tests/project-creation-harness';
import { getProjectCreationMocks } from '@tests/project-creation-mock-state';

import type { ActiveStageType } from '@api/types';

describe('project creation: navigation', () => {
  const mocks = getProjectCreationMocks();
  const context = setupProjectCreation();
  const { input, fill, submit, click, clickStep, objectStep, stageDates, renderForm, multipleStages, toggleStage } =
    context;

  it('leaves stage dates empty and retains edited checklist across steps and template refresh', async () => {
    await objectStep();

    expect(input('stages.0.plannedStartDate').value).toBe('');

    await fill('stages.0.checklistItems.0.title', 'Индивидуальный пункт');
    await stageDates();
    await click('Назад');
    await click('Назад');

    expect(input('ownerName').value).toBe('Иван Иванов');

    await renderForm([{ ...(types[0] as ActiveStageType), checklistItems: [] }]);
    await submit();
    await click('Заполнить этапы');

    expect(input('stages.0.checklistItems.0.title').value).toBe('Индивидуальный пункт');
    expect(input('stages.0.plannedStartDate').value).toBe('2026-10-05');
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
  });

  it('updates stage summaries on inclusion changes and retains edited fields when re-enabled', async () => {
    await objectStep();
    await stageDates();
    await fill('stages.0.checklistItems.0.title', 'Индивидуальный пункт');
    await click('Назад');

    const checkbox = context.container.querySelector<HTMLElement>('#include-foundation');
    if (!checkbox) throw new Error('Missing stage checkbox');

    await flush(() => checkbox.click());

    expect(context.container.textContent).toContain('Включено этапов: 0 из 1.');

    await submit();

    expect(context.container.textContent).toContain('Включите хотя бы один этап.');
    expect(mocks.create).not.toHaveBeenCalled();

    await flush(() => checkbox.click());

    expect(context.container.textContent).toContain('Включено этапов: 1 из 1.');

    await click('Заполнить этапы');

    expect(input('stages.0.checklistItems.0.title')).toHaveValue('Индивидуальный пункт');
    expect(input('stages.0.plannedStartDate')).toHaveValue('2026-10-05');
  });

  it('visits only selected stages in catalogue order and preserves fields on next and back', async () => {
    await multipleStages();
    await objectStep(false);
    await toggleStage('walls');
    await click('Заполнить этапы');

    expect(context.container.querySelector('h2')).toHaveTextContent('Фундамент');
    expect(context.container.textContent).toContain('Этап 1 из 2.');
    expect(context.container.querySelector('[id="project-stages.2.plannedStartDate"]')).toBeNull();

    await fill('stages.0.plannedWorkAmount', '123');
    await fill('stages.0.checklistItems.0.title', 'Своя проверка');

    expect(context.container.textContent).not.toContain('Пропустить этап');

    await click('Следующий этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Крыша');
    expect(context.container.textContent).toContain('Этап 2 из 2.');
    expect(context.container.textContent).not.toContain('Следующий этап');
    expect(context.container.textContent).not.toContain('Пропустить этап');

    await click('Назад');

    expect(input('stages.0.plannedWorkAmount')).toHaveValue('123');
    expect(input('stages.0.checklistItems.0.title')).toHaveValue('Своя проверка');

    await click('Следующий этап');

    mocks.create.mockResolvedValueOnce({ id: 77 });

    await click('Создать объект');

    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      body: {
        stages: [
          { type: 'foundation', plannedWorkAmountMinor: 12300n, checklistItems: [{ title: 'Своя проверка' }] },
          { type: 'roof', plannedStartDate: null, plannedEndDate: null, plannedWorkAmountMinor: null },
        ],
      },
    });
  });

  it('switches between all three steps by click without losing object or stage fields', async () => {
    await multipleStages();
    await objectStep();
    await fill('stages.0.plannedWorkAmount', '123');
    await fill('stages.0.checklistItems.0.title', 'Своя проверка');
    await clickStep(1);

    expect(input('ownerName')).toHaveValue('Иван Иванов');

    await clickStep(2);

    expect(context.container.querySelector('h2')).toHaveTextContent('Выбор этапов');

    await toggleStage('walls');
    await clickStep(3);

    expect(context.container.querySelector('h2')).toHaveTextContent('Фундамент');
    expect(input('stages.0.plannedWorkAmount')).toHaveValue('123');
    expect(input('stages.0.checklistItems.0.title')).toHaveValue('Своя проверка');
    expect(context.container.querySelector('button[aria-label="3. Заполнение"]')).toHaveAttribute(
      'aria-current',
      'step',
    );

    await click('Следующий этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Крыша');

    await clickStep(3);

    expect(context.container.querySelector('h2')).toHaveTextContent('Крыша');
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
