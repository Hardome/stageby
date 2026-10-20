// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { MyStagesList } from './my-stages-list';

const mocks = vi.hoisted(() => ({ query: vi.fn(), access: vi.fn(), retry: vi.fn(), page: vi.fn() }));
vi.mock('@api/queries/useListStages', () => ({ useListStages: mocks.query }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    search,
  }: {
    children: React.ReactNode;
    params: { stageId: string };
    search: { offset: number };
  }) => <a href={`/stages/${params.stageId}?offset=${search.offset}`}>{children}</a>,
}));

const stage = {
  id: 7,
  title: 'Фундамент',
  projectOwnerName: 'Анна',
  projectAddress: 'Лесная, 10',
  projectCoordinates: { latitude: 56.8, longitude: 60.6 },
  status: 'paid',
  plannedStartDate: null,
  plannedEndDate: null,
  plannedWorkAmountMinor: null,
  actualWorkAmountMinor: 10000n,
  totalActualAmountMinor: 987654321n,
};

describe('my stages list', () => {
  let root: Root;
  let container: HTMLDivElement;

  async function render(query: object, offset = 0) {
    mocks.query.mockReturnValue({ refetch: mocks.retry, isSuccess: true, isFetching: false, ...query });
    await act(async () => {
      root.render(<MyStagesList search={{ offset }} onPageChange={mocks.page} />);
      await Promise.resolve();
    });
  }

  async function click(text: string) {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === text);
    await act(async () => {
      button?.click();
      await Promise.resolve();
    });
  }

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

  it('shows initial loading, empty state and retry', async () => {
    await render({ isPending: true, isLoading: true, isSuccess: false });
    expect(container.querySelector('[role="status"]')).toHaveAttribute('aria-label', 'Загрузка этапов');

    await render({ data: { items: [], total: 0 } });
    expect(container).toHaveTextContent('Вам пока не назначены этапы');

    await render({ isError: true, isSuccess: false, error: { status: 500 } });
    expect(container).toHaveTextContent('Не удалось загрузить этапы.');
    await click('Повторить');
    expect(mocks.retry).toHaveBeenCalledOnce();
  });

  it('retains paid stages across projects and links only to stages and maps', async () => {
    await render(
      { data: { items: [stage, { ...stage, id: 8, projectOwnerName: 'Иван', status: 'completed' }], total: 2 } },
      0,
    );

    expect(container).toHaveTextContent('Анна');
    expect(container).toHaveTextContent('Иван');
    expect(container).toHaveTextContent('Выплачен');
    expect(container).toHaveTextContent('Даты не заданы');
    expect(container).toHaveTextContent('Не задан');
    expect(container.querySelector('a[href="/stages/7?offset=0"]')).not.toBeNull();
    expect(container.querySelector('a[href*="pt=60.6,56.8"]')).not.toBeNull();
    expect(container.querySelector('a[href^="/projects"]')).toBeNull();
    expect(container).not.toHaveTextContent('9 876 543');
  });

  it('keeps current stages during refresh and removes a revoked assignment afterward', async () => {
    await render({ data: { items: [stage], total: 1 } });

    await render({ data: { items: [stage], total: 1 }, isFetching: true });

    expect(container.querySelector('section')).toHaveAttribute('aria-busy', 'true');
    expect(container).toHaveTextContent('Анна');

    await render({ data: { items: [], total: 0 } });

    expect(container).not.toHaveTextContent('Анна');
    expect(container).toHaveTextContent('Вам пока не назначены этапы');
  });

  it('paginates by 20 and blocks repeated changes during refresh', async () => {
    const data = { items: [stage], total: 41 };
    await render({ data }, 20);
    expect(mocks.query).toHaveBeenCalledWith({ query: { limit: 20, offset: 20 } }, expect.anything());
    expect(container.querySelector('a[href="/stages/7?offset=20"]')).not.toBeNull();

    await click('Далее');
    expect(mocks.page).toHaveBeenCalledWith(40);
    await click('Назад');
    expect(mocks.page).toHaveBeenCalledWith(0);

    await render({ data, isFetching: true }, 20);
    expect(container.querySelector('section')).toHaveAttribute('aria-busy', 'true');
    expect(container).toHaveTextContent('Обновляем список…');
    expect(
      [...container.querySelectorAll(':scope nav button')].every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true);
    expect(container).toHaveTextContent('Анна');
  });

  it('corrects an empty final page after an assignment is removed', async () => {
    await render({ data: { total: 20, items: [] } }, 20);
    expect(mocks.page).toHaveBeenCalledWith(0, true);
  });

  it.each([403, 404])('handles access error %s', async (status) => {
    await render({ isError: true, isSuccess: false, error: { status } });
    expect(mocks.access).toHaveBeenCalledWith({ status });
    expect(container).toHaveTextContent('404 — Страница не найдена');
  });

  it('clears an expired session through the shared access handler', async () => {
    await render({ isError: true, isSuccess: false, error: { status: 401 } });
    expect(mocks.access).toHaveBeenCalledWith({ status: 401 });
  });

  it('marks overdue stages with only an end date and distinguishes a zero plan', async () => {
    await render({
      data: {
        items: [{ ...stage, status: 'assigned', plannedEndDate: '2020-01-01', plannedWorkAmountMinor: 0n }],
        total: 1,
      },
    });

    expect(container).toHaveTextContent('Дата начала не задана — 01.01.2020');
    expect(container).toHaveTextContent('Просрочен');
    expect(container).toHaveTextContent('0 ₽');
    expect(container).not.toHaveTextContent('Не задан');

    await render({ data: { items: [{ ...stage, status: 'assigned', plannedStartDate: '2020-01-01' }], total: 1 } });

    expect(container).toHaveTextContent('01.01.2020 — Дата окончания не задана');
    expect(container).not.toHaveTextContent('Просрочен');
  });
});
