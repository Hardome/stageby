import { setupProjectCreation } from '@tests/project-creation-harness';
import { getProjectCreationMocks } from '@tests/project-creation-mock-state';

describe('project creation: submission', () => {
  const mocks = getProjectCreationMocks();
  const context = setupProjectCreation();
  const { input, submit, objectStep, multipleStages, toggleStage, fill, stageDates, renderForm } = context;

  it('opens the correct server-rejected stage across excluded stages', async () => {
    await multipleStages();
    await objectStep(false);
    await toggleStage('walls');

    mocks.create.mockRejectedValueOnce({
      status: 400,
      data: { details: [{ path: 'body.stages.1.plannedEndDate', message: 'Срок изменился' }] },
    });

    await submit();

    expect(context.container.querySelector('h2')).toHaveTextContent('Крыша');

    await vi.waitFor(() => expect(input('stages.2.plannedEndDate')).toHaveFocus());

    expect(input('stages.2.plannedEndDate')).not.toBeDisabled();
    expect(context.container.textContent).toContain('Срок изменился');
  });

  it('rejects invalid manual dates instead of submitting a previously selected date', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    await renderForm();
    await objectStep();
    await stageDates();
    await fill('stages.0.plannedStartDate', '31.02.2026');
    await submit();

    expect(input('stages.0.plannedStartDate')).toHaveValue('31.02.2026');
    expect(input('stages.0.plannedStartDate')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
