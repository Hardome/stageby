import { setupProjectCreation } from '@tests/project-creation-harness';
import { getProjectCreationMocks } from '@tests/project-creation-mock-state';

describe('project creation: validation', () => {
  const mocks = getProjectCreationMocks();
  const context = setupProjectCreation();
  const { input, fill, submit, click, objectStep, multipleStages, toggleStage, clickStep } = context;

  it('validates the first step before allowing stage configuration', async () => {
    expect(context.container.querySelector('button[type="submit"]')).toBeNull();
    expect(context.container.textContent).not.toContain('Создать объект');

    await submit();

    expect(input('ownerName').getAttribute('aria-invalid')).toBe('true');

    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());

    expect(mocks.create).not.toHaveBeenCalled();
    expect(context.container.textContent).not.toContain('Включено этапов:');
  });

  it('allows the next step with empty stage dates without showing their errors', async () => {
    await objectStep();

    expect(context.container.textContent).toContain('Этап 1 из 1.');
    expect(input('stages.0.plannedStartDate')).toHaveValue('');
    expect(input('stages.0.plannedStartDate')).toHaveAttribute('aria-invalid', 'false');
    expect(context.container.textContent).not.toContain('Укажите дату этапа.');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('requires at least one stage before opening the first editor', async () => {
    await objectStep(false);
    await toggleStage('foundation');
    await click('Заполнить этапы');

    expect(context.container.textContent).toContain('Включите хотя бы один этап.');

    await vi.waitFor(() => expect(context.container.querySelector('[role="checkbox"]')).toHaveFocus());

    expect(context.container.querySelector('[id="project-stages.0.plannedStartDate"]')).toBeNull();

    await toggleStage('foundation');

    expect(context.container.textContent).not.toContain('Включите хотя бы один этап.');

    await click('Заполнить этапы');

    expect(context.container.textContent).toContain('Этап 1 из 1.');
  });

  it('validates next and returns to an invalid stage when creating from selection', async () => {
    await multipleStages();
    await objectStep();
    await fill('stages.0.plannedEndDate', '2027-01-01');
    await click('Следующий этап');

    expect(context.container.querySelector('h2')).toHaveTextContent('Фундамент');

    await vi.waitFor(() => expect(input('stages.0.plannedEndDate')).toHaveFocus());
    await click('Назад');
    await submit();

    expect(mocks.create).not.toHaveBeenCalled();
    expect(context.container.querySelector('h2')).toHaveTextContent('Фундамент');

    await vi.waitFor(() => expect(input('stages.0.plannedEndDate')).toHaveFocus());
    await click('Назад');
    await toggleStage('foundation');

    mocks.create.mockResolvedValueOnce({ id: 77 });

    await submit();

    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({ body: { stages: [{ type: 'walls' }, { type: 'roof' }] } });
  });

  it('shows and clears field errors on change before submitting either step', async () => {
    await fill('ownerName', ' ');

    expect(input('ownerName')).toHaveAttribute('aria-invalid', 'true');
    expect(context.container.textContent).toContain('Укажите клиента.');

    await fill('ownerName', 'Иван Иванов');

    expect(input('ownerName')).toHaveAttribute('aria-invalid', 'false');
    expect(context.container.textContent).not.toContain('Укажите клиента.');

    await objectStep();
    await fill('stages.0.plannedEndDate', '2027-01-01');

    expect(input('stages.0.plannedEndDate')).toHaveAttribute('aria-invalid', 'true');
    expect(context.container.textContent).toContain('Дата должна находиться внутри сроков проекта.');

    await fill('stages.0.plannedEndDate', '2026-10-31');

    expect(input('stages.0.plannedEndDate')).toHaveAttribute('aria-invalid', 'false');
    expect(context.container.textContent).not.toContain('Дата должна находиться внутри сроков проекта.');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('validates required object fields before opening selection or configuration by click', async () => {
    await clickStep(2);

    expect(context.container.querySelector('h2')).toHaveTextContent('Объект');

    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
    await clickStep(3);

    expect(context.container.querySelector('h2')).toHaveTextContent('Объект');
    expect(input('ownerName')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('opens selection with an error when configuration is clicked with no selected stages', async () => {
    await objectStep(false);
    await toggleStage('foundation');
    await clickStep(1);
    await clickStep(3);

    expect(context.container.querySelector('h2')).toHaveTextContent('Выбор этапов');
    expect(context.container.textContent).toContain('Включите хотя бы один этап.');

    await vi.waitFor(() => expect(context.container.querySelector('[role="checkbox"]')).toHaveFocus());

    expect(mocks.create).not.toHaveBeenCalled();
  });
});
