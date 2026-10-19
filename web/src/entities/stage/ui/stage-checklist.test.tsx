// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { StageChecklist } from './stage-checklist';

const mocks = vi.hoisted(() => ({ query: vi.fn(), retry: vi.fn(), access: vi.fn() }));
vi.mock('@api/queries/useGetStageChecklist', () => ({ useGetStageChecklist: mocks.query }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));

describe('working checklist', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(query: object) {
    mocks.query.mockReturnValue({ refetch: mocks.retry, ...query });
    await act(async () => {
      root.render(
        <StageChecklist stageId={11} itemLink={(item) => <a href={`/photos/${item.id}`}>Открыть {item.title}</a>} />,
      );
      await Promise.resolve();
    });
  }

  it('sorts items and displays rework comments and photo states without progress', async () => {
    const { checklist } = editStage();
    const first = checklist.items[0];
    if (!first) throw new Error('Отсутствует тестовый пункт');
    await render({
      data: {
        ...checklist,
        progressPercent: 33,
        warnings: ['predecessor_incomplete', 'materials_incomplete'],
        items: [
          { ...first, id: 3, position: 3, title: 'Третий', photoCount: 2 },
          { ...first, id: 2, position: 2, title: 'Второй', requiresRework: true, reworkComment: 'Исправить угол' },
          { ...first, id: 1, position: 1, title: 'Первый', isCompleted: true, photosDeletedByRetention: true },
        ],
      },
    });
    expect([...container.querySelectorAll(':scope li a')].map((link) => link.getAttribute('href'))).toEqual([
      '/photos/1',
      '/photos/2',
      '/photos/3',
    ]);
    expect(container).not.toHaveTextContent('Выполнено 1 из 3');
    expect(container.querySelector('progress')).toBeNull();
    expect(container).toHaveTextContent('Фото не приложены');
    expect(container).toHaveTextContent('Фото: 2');
    expect(container).toHaveTextContent('Выполнение сохраняется');
    expect(container).toHaveTextContent('Исправить угол');
    expect(container).toHaveTextContent('Предыдущий этап ещё не выполнен');
    expect(container).toHaveTextContent('Работы начаты до полной комплектации');
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('does not present an empty checklist as completed', async () => {
    await render({ data: { ...editStage().checklist, items: [] } });
    expect(container).toHaveTextContent('Чек-лист пуст');
    expect(container.querySelector('progress')).toBeNull();
  });

  it('preserves data on background failure and supports retry', async () => {
    await render({ data: editStage().checklist, error: { status: 500 } });
    expect(container).toHaveTextContent('Армирование');
    expect(container).toHaveTextContent('Не удалось загрузить чек-лист');
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });
    expect(mocks.retry).toHaveBeenCalledOnce();
    expect(mocks.access).toHaveBeenCalled();
  });
});
