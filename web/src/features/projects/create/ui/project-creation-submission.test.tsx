import { flush, setupProjectCreation } from '@tests/project-creation-harness';
import { getProjectCreationMocks } from '@tests/project-creation-mock-state';

import { getProjectQueryKey } from '@api/queries/useGetProject';

describe('project creation: submission', () => {
  const mocks = getProjectCreationMocks();
  const context = setupProjectCreation();
  const { input, submit, objectStep, stageDates } = context;

  it('creates from stage selection without opening stage editors', async () => {
    await objectStep(false);

    expect(context.container.querySelector('[id="project-stages.0.plannedStartDate"]')).toBeNull();

    mocks.create.mockResolvedValueOnce({ id: 77 });

    await submit();

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      body: { stages: [{ plannedStartDate: null, plannedEndDate: null }] },
    });
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });

  it('retries the same request and key after a lost response and updates the cache', async () => {
    await objectStep();
    await stageDates();

    mocks.create.mockRejectedValueOnce(new Error('Network error'));

    await submit();

    expect(context.container.textContent).toContain('Повторить');
    expect(input('stages.0.plannedStartDate').disabled).toBe(true);

    for (const button of context.container.querySelectorAll(':scope ol[aria-label="Шаги создания"] button'))
      expect(button).toBeDisabled();
    const firstRequest: unknown = mocks.create.mock.calls[0]?.[0];

    expect(firstRequest).toMatchObject({ body: { ownerName: 'Иван Иванов', documentFileIds: [] } });

    const project = { id: 77 };
    mocks.create.mockResolvedValueOnce(project);
    mocks.success.mockImplementation(() => {
      expect(context.queryClient.getQueryData(getProjectQueryKey({ path: { projectId: 77 } }))).toEqual(project);
    });

    await submit();

    expect(mocks.create.mock.calls[1]?.[0]).toEqual(firstRequest);
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });

  it('keeps RHF submitting until the request and completion finish and prevents duplicate requests', async () => {
    await objectStep();
    await stageDates();

    const request = Promise.withResolvers<{ id: number }>();
    const completion = Promise.withResolvers<void>();
    mocks.create.mockReturnValueOnce(request.promise);
    mocks.success.mockReturnValueOnce(completion.promise);

    await submit();

    expect(context.container.querySelector('[data-form-submitting]')).toHaveAttribute('data-form-submitting', 'true');
    expect(context.container.querySelector('button[type="submit"]')).toBeDisabled();

    await submit();

    expect(mocks.create).toHaveBeenCalledTimes(1);

    await flush(() => request.resolve({ id: 77 }));

    expect(mocks.success).toHaveBeenCalledTimes(1);
    expect(context.container.querySelector('[data-form-submitting]')).toHaveAttribute('data-form-submitting', 'true');
    expect(context.container.querySelector('button[type="submit"]')).toBeDisabled();

    await flush(() => completion.resolve());

    expect(context.container.querySelector('[data-form-submitting]')).toHaveAttribute('data-form-submitting', 'false');
  });

  it('unlocks the form and displays field errors after definite validation rejection', async () => {
    await objectStep();
    await stageDates();

    mocks.create.mockRejectedValueOnce({
      status: 400,
      data: { details: [{ path: 'body.stages.0.plannedEndDate', message: 'Срок изменился' }] },
    });

    await submit();

    expect(input('stages.0.plannedEndDate').disabled).toBe(false);

    await vi.waitFor(() => expect(input('stages.0.plannedEndDate')).toHaveFocus());

    expect(context.container.textContent).toContain('Срок изменился');
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('does not offer or send retries after an idempotency conflict', async () => {
    await objectStep();
    await stageDates();

    mocks.create.mockRejectedValueOnce({ status: 409, data: { code: 'idempotency_conflict' } });

    await submit();

    expect(context.container.textContent).toContain('Повтор не устранит конфликт.');
    expect(context.container.querySelector('button[type="submit"]')).toBeNull();
    expect(context.container.textContent).not.toContain('Повтор безопасен');
    expect(input('stages.0.plannedStartDate')).toBeDisabled();

    await submit();

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.success).not.toHaveBeenCalled();
  });
});
