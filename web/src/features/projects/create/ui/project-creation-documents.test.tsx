import { flush, setupProjectCreation } from '@tests/project-creation-harness';
import { getProjectCreationMocks } from '@tests/project-creation-mock-state';

describe('project creation: documents', () => {
  const mocks = getProjectCreationMocks();
  const context = setupProjectCreation();
  const { input, submit, click, objectStep, stageDates } = context;

  it('retains uploads across steps, blocks unfinished files and submits completed file IDs', async () => {
    const pending = Promise.withResolvers<void>();
    mocks.upload.mockReturnValueOnce(pending.promise);

    await flush(() => {
      const picker = input('documents');
      Object.defineProperty(picker, 'files', {
        value: [new File(['%PDF-1.7'], 'drawing.pdf', { type: 'application/pdf' })],
        configurable: true,
      });
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(context.container.textContent).toContain('drawing.pdf');
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);

    await objectStep();
    await stageDates();
    await submit();

    expect(mocks.create).not.toHaveBeenCalled();

    await click('Назад');
    await click('Назад');

    expect(context.container.textContent).toContain('drawing.pdf');

    await flush(() => {
      pending.reject(new Error('Ошибка сети'));
    });

    expect(context.container.textContent).toContain('Ошибка сети');

    mocks.upload.mockImplementationOnce((_item: unknown, update: (values: { fileId: number }) => void) => {
      update({ fileId: 41 });

      return Promise.resolve();
    });

    await click('Повторить');

    expect(context.container.textContent).toContain('Загружен');

    await submit();

    mocks.create.mockResolvedValueOnce({ id: 77 });

    await submit();

    const request = mocks.create.mock.calls[0]?.[0] as { body: { documentFileIds: number[] } };

    expect(request.body.documentFileIds).toEqual([41]);
  });
});
