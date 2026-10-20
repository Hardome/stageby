import { flush, setupProjectCreation } from '@tests/project-creation-harness';
import { getProjectCreationMocks } from '@tests/project-creation-mock-state';
import { revealProjectChecklist } from '@tests/reveal-project-checklist';

describe('project creation: focus', () => {
  const mocks = getProjectCreationMocks();
  const context = setupProjectCreation();
  const { input, fill, submit, click, clickStep, objectStep, multipleStages } = context;

  it('focuses on each failed attempt without stealing focus while editing', async () => {
    await submit();
    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
    await flush(() => input('address').focus());
    await fill('address', 'Екатеринбург');
    await vi.waitFor(() => expect(input('address')).toHaveFocus());
    await submit();
    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
  });

  it('focuses the visible object error when a hidden stage also has errors', async () => {
    await objectStep();
    await fill('stages.0.checklistItems.0.title', ' ');
    await clickStep(1);
    await fill('ownerName', ' ');
    await submit();
    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
  });

  it('opens and focuses the first invalid stage when creating from selection', async () => {
    await objectStep();
    await fill('stages.0.plannedEndDate', '2027-01-01');
    await click('Назад');
    await submit();

    expect(input('stages.0.plannedEndDate')).toHaveAttribute('aria-invalid', 'true');

    await vi.waitFor(() => expect(input('stages.0.plannedEndDate')).toHaveFocus());

    expect(mocks.create).not.toHaveBeenCalled();
    expect(context.container.textContent).toContain('Дата должна находиться внутри сроков проекта.');
  });

  it('validates project date order and focuses the end date on the first step', async () => {
    await fill('ownerName', 'Иван Иванов');
    await fill('address', 'Екатеринбург');
    await fill('coordinates', '56.8, 60.6');
    await fill('plannedStartDate', '2026-10-05');
    await fill('plannedEndDate', '2026-10-04');
    await submit();

    expect(context.container.textContent).toContain('Окончание проекта не может быть раньше начала.');

    await vi.waitFor(() => expect(input('plannedEndDate')).toHaveFocus());

    expect(context.container.textContent).not.toContain('Включено этапов:');

    await fill('plannedEndDate', '2026-12-31');
    await submit();

    expect(context.container.textContent).toContain('Включено этапов:');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('focuses the checklist error when creating from selection with no items', async () => {
    await multipleStages();
    await objectStep();

    const remove = context.container.querySelector<HTMLButtonElement>('button[aria-label="Удалить пункт 1"]');
    if (!remove) throw new Error('Missing checklist remove button');

    await revealProjectChecklist(remove);
    await flush(() => remove.click());
    await click('Назад');
    await submit();

    expect(context.container.querySelector('h2')).toHaveTextContent('Фундамент');
    expect(context.container.textContent).toContain('Добавьте хотя бы один пункт.');
    expect(context.container.querySelector('button[aria-invalid="true"]')).toHaveAttribute('aria-expanded', 'true');

    await vi.waitFor(() => expect(context.container.querySelector('button[aria-invalid="true"]')).toHaveFocus());

    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('mounts and focuses a nested checklist field when submitting from selection', async () => {
    await objectStep();

    const trigger = context.container.querySelector<HTMLButtonElement>('[data-slot="accordion-trigger"]');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await fill('stages.0.checklistItems.0.title', ' ');
    await flush(() => trigger?.click());

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await click('Назад');
    await submit();
    await vi.waitFor(() => expect(input('stages.0.checklistItems.0.title')).toHaveFocus());

    expect(context.container.querySelector('[data-slot="accordion-trigger"]')).toHaveAttribute('aria-expanded', 'true');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('reopens a collapsed invalid checklist on another save attempt', async () => {
    await objectStep();
    await fill('stages.0.checklistItems.0.title', ' ');
    await submit();

    const trigger = context.container.querySelector<HTMLButtonElement>('[data-slot="accordion-trigger"]');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await flush(() => trigger?.click());

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await submit();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await vi.waitFor(() => expect(input('stages.0.checklistItems.0.title')).toHaveFocus());
  });
});
