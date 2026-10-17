import { click, fill, input, setupProjectEditing } from '@tests/project-editing-harness';
import { getProjectEditingMocks } from '@tests/project-editing-mock-state';

describe('additional stage errors', () => {
  const mocks = getProjectEditingMocks();
  const context = setupProjectEditing();

  async function addStage() {
    await context.render();
    await click('Далее');
    await click('Заполнить этапы');
    await click('Доп. этап');
    await click('Добавить пункт');
    await fill('stages.2.checklistItems.0.title', 'Контроль');
  }

  it('shows and focuses a new stage field error while preserving edits and allowing retry', async () => {
    await addStage();
    await click('Назад');
    mocks.update.mockRejectedValueOnce({
      status: 400,
      data: { details: [{ path: 'body.additionalStage.checklistItems.0.title', message: 'Пункт отклонён' }] },
    });

    await context.submit();

    expect(context.container).toHaveTextContent('Пункт отклонён');
    expect(input('stages.2.checklistItems.0.title')).toHaveValue('Контроль');

    await vi.waitFor(() => expect(input('stages.2.checklistItems.0.title')).toHaveFocus());
    await fill('stages.2.checklistItems.0.title', 'Проверить');
    await context.submit();

    expect(mocks.update).toHaveBeenCalledTimes(2);
    expect(mocks.success).toHaveBeenCalledOnce();
  });

  it('preserves the new stage on a version conflict and blocks further submissions', async () => {
    await addStage();
    mocks.update.mockRejectedValueOnce({
      status: 409,
      data: { code: 'version_conflict', message: 'Объект изменён другим руководителем' },
    });

    await context.submit();

    expect(context.container).toHaveTextContent('Объект изменён другим руководителем');
    expect(input('stages.2.checklistItems.0.title')).toHaveValue('Контроль');
    expect(context.container.querySelector('button[type="submit"]')).toBeDisabled();

    await context.submit();
    await click('Загрузить актуальные данные');
    await click('Оставить правки');

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(input('stages.2.checklistItems.0.title')).toHaveValue('Контроль');
    expect(context.container).not.toHaveTextContent('Доп. этап');
  });

  it('blocks adding a stage to an archived project with an explanation', async () => {
    context.snapshot.project.isArchived = true;

    await context.render();

    expect(context.container).toHaveTextContent('Объект в архиве. Редактирование недоступно.');
    expect(context.container.querySelector('form')).toBeNull();
    expect(context.container).not.toHaveTextContent('Доп. этап');
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
