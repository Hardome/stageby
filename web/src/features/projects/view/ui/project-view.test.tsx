// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { ProjectView } from './project-view';

const mocks = vi.hoisted(() => ({ project: vi.fn(), stages: vi.fn(), access: vi.fn(), retry: vi.fn() }));
vi.mock('@api/queries/useGetProject', () => ({ useGetProject: mocks.project }));
vi.mock('@api/queries/useListProjectStages', () => ({ useListProjectStages: mocks.stages }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params }: { children: React.ReactNode; params: { stageId: string } }) => (
    <a href={`/stages/${params.stageId}`}>{children}</a>
  ),
}));

const finances = {
  plannedWorkAmountMinor: null,
  actualWorkAmountMinor: 10000n,
  plannedMaterialAmountMinor: 0n,
  actualMaterialAmountMinor: 0n,
  totalPlannedAmountMinor: null,
  totalActualAmountMinor: 10000n,
  isPlanComplete: false,
};
const project = {
  id: 1,
  ownerName: 'Анна',
  address: 'Лесная, 10',
  coordinates: { latitude: 56, longitude: 60 },
  plannedStartDate: '2026-10-01',
  plannedEndDate: '2026-12-01',
  status: 'created',
  documentFileIds: [],
  finances,
};
const stage = {
  id: 2,
  title: 'Стены',
  position: 2,
  isIncluded: true,
  status: 'assigned',
  plannedStartDate: null,
  plannedEndDate: null,
  assignee: { id: 4, fullName: 'Иван' },
  progressPercent: 25,
  plannedWorkAmountMinor: null,
  actualWorkAmountMinor: 10000n,
  plannedMaterialAmountMinor: 0n,
  actualMaterialAmountMinor: 0n,
  materialSummary: { color: 'red', invoiceCount: 0, openShortageCount: 0 },
};

describe('project view', () => {
  let root: Root;
  let container: HTMLDivElement;
  async function render(projectQuery: object, stageQuery: object = {}) {
    mocks.project.mockReturnValue({ refetch: mocks.retry, ...projectQuery });
    mocks.stages.mockReturnValue({ refetch: mocks.retry, ...stageQuery });
    await act(async () => {
      root.render(<ProjectView projectId={1} />);
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
  it('handles loading and missing project separately', async () => {
    await render({ isPending: true });
    expect(container.querySelector('[role="status"]')).toHaveAttribute('aria-label', 'Загрузка объекта');
    await render({ error: { status: 404 } });
    expect(container).toHaveTextContent('404 — Страница не найдена');
    expect(container.querySelector('button')).toBeNull();
  });
  it('keeps project content when stages fail, supports retry and partial plans', async () => {
    await render({ data: project }, { isError: true, error: { status: 500 } });
    expect(container).toHaveTextContent('Анна');
    expect(container).toHaveTextContent('Не задан');
    expect(container).toHaveTextContent('План: 0 ₽');
    expect(container.querySelector('a')).toHaveAttribute('href', 'https://yandex.ru/maps/?pt=60,56&z=16&l=map');
    const retry = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Повторить загрузку этапов',
    );
    await act(async () => {
      retry?.click();
      await Promise.resolve();
    });
    expect(mocks.retry).toHaveBeenCalledOnce();
  });
  it('orders included stages, shows progress and keeps data on refetch error', async () => {
    await render(
      { data: project, isFetching: true },
      {
        data: {
          items: [
            stage,
            { ...stage, id: 1, title: 'Фундамент', position: 1 },
            { ...stage, id: 3, title: 'Крыша', isIncluded: false },
          ],
        },
      },
    );
    expect([...container.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual(['Фундамент', 'Стены']);
    expect(container).not.toHaveTextContent('Крыша');
    expect(container).toHaveTextContent('Даты не заданы');
    expect(container.querySelector('progress')).toHaveAttribute('value', '25');
    await render({ data: project, isError: true }, { data: { items: [] } });
    expect(container).toHaveTextContent('Показаны ранее загруженные данные');
    expect(container).toHaveTextContent('Анна');
  });
});
