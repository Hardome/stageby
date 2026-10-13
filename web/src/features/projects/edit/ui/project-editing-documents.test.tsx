import { click, flush, input, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

import type { UpdateProjectOptions } from '@api/types';

describe('project editing: documents', () => {
  const mocks = getProjectEditingMocks();
  const context = setupProjectEditing();
  const { submit, render } = context;

  it('preserves documents by ID, blocks incomplete uploads, retries and sends the final PDF list', async () => {
    await render();
    await click('Удалить PDF 1');

    const pending = Promise.withResolvers<void>();
    mocks.upload.mockReturnValueOnce(pending.promise);

    await flush(() => {
      const picker = input('documents');
      Object.defineProperty(picker, 'files', {
        configurable: true,
        value: [new File(['%PDF-1.7'], 'drawing.pdf', { type: 'application/pdf' })],
      });
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await submit();

    expect(mocks.update).not.toHaveBeenCalled();
    expect(context.container.querySelector('button[type="submit"]')).toBeDisabled();

    await flush(() => pending.reject(new Error('Ошибка сети')));

    mocks.upload.mockImplementationOnce((_item: unknown, update: (value: { fileId: number }) => void) => {
      update({ fileId: 90 });

      return Promise.resolve();
    });

    await click('Повторить');
    await submit();

    const options = mocks.update.mock.calls[0]?.[0] as UpdateProjectOptions;

    expect(options.body.documentFileIds).toEqual([82, 90]);
  });
});
