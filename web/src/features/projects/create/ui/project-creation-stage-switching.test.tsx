import { flush, setupProjectCreation } from '@tests/project-creation-harness';
import { getProjectCreationMocks } from '@tests/project-creation-mock-state';

describe('project creation: direct stage switching', () => {
  const context = setupProjectCreation();
  const mocks = getProjectCreationMocks();

  async function selectStage(title: string) {
    const button = [...context.container.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.getAttribute('aria-label') === title,
    );
    if (!button) throw new Error(`Missing stage ${title}`);

    await flush(() => {
      button.focus();
      button.click();
    });
  }

  it('requires object fields before opening a stage and validates them on submission', async () => {
    await context.multipleStages();
    await selectStage('Этап 3. Крыша');

    expect(context.container.querySelector('h2')).toHaveTextContent('Объект');
    expect(context.input('ownerName')).toHaveAttribute('aria-invalid', 'true');
    await vi.waitFor(() => expect(context.input('ownerName')).toHaveFocus());

    await context.objectStep(false);
    await selectStage('Этап 3. Крыша');

    expect(context.container.querySelector('h2')).toHaveTextContent('Крыша');
    expect(context.container.querySelector('h2')).toHaveFocus();

    await selectStage('Этап 3. Крыша');

    expect(context.container.querySelector('h2')).toHaveFocus();

    await context.fill('stages.2.plannedWorkAmount', '350');
    await selectStage('Этап 1. Фундамент');
    await selectStage('Этап 3. Крыша');

    expect(context.input('stages.2.plannedWorkAmount')).toHaveValue('350');

    await context.submit();

    expect(context.container.querySelector('h2')).toHaveTextContent('Объект');
    await vi.waitFor(() => expect(context.input('ownerName')).toHaveFocus());
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('allows leaving invalid stages, retains errors, and preserves sequential validation', async () => {
    await context.multipleStages();
    await context.objectStep();
    await context.fill('stages.0.checklistItems.0.title', '');
    await context.click('Следующий этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Фундамент');

    await selectStage('Этап 3. Крыша');

    expect(context.container.querySelector('h2')).toHaveTextContent('Крыша');
    expect(context.container.querySelector('button[aria-label="Этап 1. Фундамент. Есть ошибки"]')).not.toBeNull();

    await context.submit();

    expect(context.container.querySelector('h2')).toHaveTextContent('Фундамент');
    expect(context.input('stages.0.checklistItems.0.title')).toHaveFocus();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('uses original form indexes after exclusion and disables an empty stage selector', async () => {
    await context.multipleStages();
    await context.objectStep(false);
    await context.toggleStage('walls');
    await selectStage('Этап 2. Крыша');
    await context.fill('stages.2.plannedWorkAmount', '123');
    await context.clickStep(2);
    await context.toggleStage('roof');
    await context.toggleStage('foundation');

    expect(context.container.querySelector('button[aria-label="Выбрать этап: Выберите этапы"]')).toBeDisabled();

    await context.toggleStage('roof');
    await selectStage('Этап 1. Крыша');

    expect(context.input('stages.2.plannedWorkAmount')).toHaveValue('123');
    expect(context.container).toHaveTextContent('Этап 1 из 1.');
  });
});
