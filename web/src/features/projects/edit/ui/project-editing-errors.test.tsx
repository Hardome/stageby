import { editSnapshot } from '@tests/project-edit-fixture';
import { click, fill, input, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

describe('project editing: errors', () => {
  const mocks = getProjectEditingMocks();
  const context = setupProjectEditing();
  const { submit, render } = context;

  it('keeps input after version conflict and reloads only after reset confirmation', async () => {
    await render();
    await fill('ownerName', 'Мария');

    mocks.update.mockRejectedValueOnce({ status: 409, data: { code: 'version_conflict', message: 'Версия устарела' } });

    await submit();

    expect(input('ownerName')).toHaveValue('Мария');
    expect(context.container.querySelector('button[type="submit"]')).toBeDisabled();

    await submit();

    expect(mocks.update).toHaveBeenCalledOnce();

    await click('Загрузить актуальные данные');
    await click('Оставить правки');

    expect(input('ownerName')).toHaveValue('Мария');

    const latest = editSnapshot();
    latest.project.ownerName = 'Сервер';
    latest.project.version = 9;
    mocks.load.mockResolvedValueOnce(latest);

    await click('Загрузить актуальные данные');
    await click('Сбросить и загрузить');

    expect(input('ownerName')).toHaveValue('Сервер');
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
    expect(context.container.querySelector('button[type="submit"]')).not.toBeDisabled();
  });

  it('maps server rejection of exclusion to the selection screen and preserves the reason', async () => {
    await render();
    await click('Далее');
    await click('Включить этап «Стены»');
    await click('Включить этап «Фундамент»');

    mocks.update.mockRejectedValueOnce({
      status: 400,
      data: {
        details: [
          {
            path: 'body.stages.0.isIncluded',
            message: 'Есть счета, выплаты или история фото.',
          },
        ],
      },
    });

    await submit();

    expect(context.container).toHaveTextContent('Выбор этапов');
    expect(context.container).toHaveTextContent('Есть счета, выплаты или история фото.');
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404])('handles %s without dropping entered values or repeating the PATCH', async (status) => {
    await render();
    await fill('ownerName', 'Мария');

    const error = { status, data: {} };
    mocks.update.mockRejectedValueOnce(error);

    await submit();

    expect(mocks.access).toHaveBeenCalledWith(error);
    expect(input('ownerName')).toHaveValue('Мария');
    expect(context.container.querySelector('button[type="submit"]')).toBeDisabled();
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it('focuses a server field error on the edited stage using the compact PATCH index', async () => {
    await render();
    await click('Далее');
    await click('Включить этап «Стены»');
    await click('Заполнить этапы');
    await click('Следующий этап');
    await fill('stages.1.plannedEndDate', '2026-10-25');

    mocks.update.mockRejectedValueOnce({
      status: 400,
      data: {
        details: [
          {
            path: 'body.stages.0.plannedEndDate',
            message: 'Срок изменился',
          },
        ],
      },
    });

    await submit();

    expect(context.container).toHaveTextContent('Срок изменился');

    await vi.waitFor(() => expect(input('stages.1.plannedEndDate')).toHaveFocus());

    expect(input('stages.1.plannedEndDate')).toHaveValue('2026-10-25');
  });
});
