import { flush, setupProjectCreation } from '@tests/project-creation-harness';
import { getProjectCreationMocks } from '@tests/project-creation-mock-state';

describe('project creation: fields', () => {
  const mocks = getProjectCreationMocks();
  const context = setupProjectCreation();
  const { input, fill, submit, click, objectStep, stageDates } = context;

  it('formats both stage plans, retains them across steps and submits exact minor amounts', async () => {
    await objectStep();
    await stageDates();
    await fill('stages.0.plannedWorkAmount', '1000000');
    await fill('stages.0.plannedMaterialAmount', '2\u{A0}500\u{A0}000');

    expect(input('stages.0.plannedWorkAmount')).toHaveValue('1 000 000');
    expect(input('stages.0.plannedMaterialAmount')).toHaveValue('2 500 000');

    await click('Назад');
    await click('Заполнить этапы');

    expect(input('stages.0.plannedWorkAmount')).toHaveValue('1 000 000');
    expect(input('stages.0.plannedMaterialAmount')).toHaveValue('2 500 000');

    await fill('stages.0.plannedWorkAmount', '-1');

    expect(input('stages.0.plannedWorkAmount')).toHaveAttribute('aria-invalid', 'true');

    await fill('stages.0.plannedWorkAmount', '1000000');

    expect(input('stages.0.plannedWorkAmount')).toHaveAttribute('aria-invalid', 'false');

    mocks.create.mockResolvedValueOnce({ id: 77 });

    await submit();

    const request = mocks.create.mock.calls[0]?.[0] as {
      body: { stages: { plannedWorkAmountMinor: bigint; plannedMaterialAmountMinor: bigint }[] };
    };

    expect(request.body.stages[0]).toMatchObject({
      plannedWorkAmountMinor: 100000000n,
      plannedMaterialAmountMinor: 250000000n,
    });
  });

  it('displays an array error when the last checklist item is removed', async () => {
    await objectStep();
    await stageDates();

    const remove = context.container.querySelector<HTMLButtonElement>('button[aria-label="Удалить пункт 1"]');
    if (!remove) throw new Error('Missing checklist remove button');

    await flush(() => remove.click());
    await submit();

    expect(context.container.textContent).toContain('Добавьте хотя бы один пункт.');
    expect(mocks.create).not.toHaveBeenCalled();

    await click('Добавить пункт');
    await fill('stages.0.checklistItems.0.title', 'Новый пункт');

    expect(context.container.textContent).not.toContain('Добавьте хотя бы один пункт.');
  });
});
