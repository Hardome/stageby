// cspell:ignore unstub
import { act, type ReactNode } from 'react';

import { keepPreviousData } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { dashboardProject, dashboardSummary } from '@tests/dashboard-fixture';

import { DashboardProjects } from './dashboard-projects';
import { DashboardSummary } from './dashboard-summary';

const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  projects: vi.fn(),
  access: vi.fn(),
  retry: vi.fn(),
  page: vi.fn(),
}));
vi.mock('@api/queries/useGetDashboardSummary', () => ({ useGetDashboardSummary: mocks.summary }));
vi.mock('@api/queries/useListDashboardProjects', () => ({ useListDashboardProjects: mocks.projects }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    hash,
    children,
    ...properties
  }: {
    to: string;
    params: { projectId?: string; stageId?: string };
    hash?: string;
    children: ReactNode;
  }) => (
    <a
      {...properties}
      href={['', to.split('/', 2)[1], params.projectId ?? params.stageId].join('/') + (hash ? `#${hash}` : '')}
    >
      {children}
    </a>
  ),
}));

describe('manager dashboard', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    mocks.summary.mockReturnValue({ data: dashboardSummary });
    mocks.projects.mockReturnValue({ data: { items: [dashboardProject], total: 21 } });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(through = '2026-10-04', offset = 0) {
    await act(async () => {
      root.render(
        <>
          <DashboardSummary through={through} today="2026-10-04" />
          <DashboardProjects today="2026-10-04" offset={offset} onPageChange={mocks.page} />
        </>,
      );
      await Promise.resolve();
    });
  }

  it('disables invalid calculations while keeping projects available', async () => {
    await render('2026-11-04');

    expect(mocks.summary).toHaveBeenCalledWith(expect.anything(), {
      query: { enabled: false, retry: false, placeholderData: keepPreviousData },
    });
    expect(container).toHaveTextContent('Расчёт недоступен');
    expect(container).toHaveTextContent('Анна');
  });

  it('distinguishes unknown plans, zero and overpayment using server metrics', async () => {
    await render();

    expect(container).toHaveTextContent('Не задан');
    expect(container).toHaveTextContent('Не рассчитан');
    expect(container).toHaveTextContent('Переплата20 ₽');
    expect(container).toHaveTextContent('0 ₽');
  });

  it('keeps the summary mounted with its response date while another date loads', async () => {
    await render();
    const summary = container.querySelector('[aria-label="Финансовая сводка"]');
    const card = summary?.querySelector('dl');
    mocks.summary.mockReturnValue({
      data: dashboardSummary,
      isLoading: false,
      isFetching: true,
      isPlaceholderData: true,
    });

    await render('2026-10-05');

    expect(summary?.querySelector('dl')).toBe(card);
    expect(card?.closest('[inert]')).not.toBeNull();
    expect(summary).toHaveTextContent('К 04.10.2026');
    expect(summary).not.toHaveTextContent('К 05.10.2026');
    expect(summary?.querySelector('[data-slot="skeleton"]')).toBeNull();

    mocks.summary.mockReturnValue({ data: { ...dashboardSummary, through: '2026-10-05' } });
    await render('2026-10-05');
    expect(summary?.querySelector('dl')).toBe(card);
    expect(summary?.querySelector('[inert]')).toBeNull();
    expect(summary).toHaveTextContent('К 05.10.2026');
  });

  it('isolates errors in each direction and retries', async () => {
    mocks.summary.mockReturnValue({ error: { status: 500 }, refetch: mocks.retry });
    await render();

    expect(container).toHaveTextContent('Анна');
    await act(async () => {
      await Promise.resolve();
      return container.querySelector('button')?.click();
    });
    expect(mocks.retry).toHaveBeenCalledOnce();

    mocks.summary.mockReturnValue({ data: dashboardSummary });
    mocks.projects.mockReturnValue({ error: { status: 500 }, refetch: mocks.retry });
    await render();

    expect(container).toHaveTextContent('Активных объектов1');
    expect(container).toHaveTextContent('Не удалось загрузить объекты.');
  });

  it('uses the same server stage for all action links until the server changes it', async () => {
    await render();

    const links = () => [...container.querySelectorAll(':scope tbody a[target="_blank"]')];
    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      '/stages/11#materials',
      '/stages/11#parameters',
      '/stages/11#checklist',
    ]);
    expect(container.querySelector('[data-variant="warning"]')).toHaveTextContent('До старта ≤ 7 дней');
    expect(container.querySelector('[data-variant="warning"]')?.closest('a')).toBeNull();
    expect(container.querySelector('[data-variant="caution"]')).not.toBeNull();
    const cards = container.querySelector('[aria-label="Карточки объектов"]');
    expect(cards).toHaveTextContent('Фундамент');
    expect(cards?.querySelectorAll('a[target="_blank"]')).toHaveLength(3);

    mocks.projects.mockReturnValue({
      data: {
        items: [{ ...dashboardProject, selectedStage: { ...dashboardProject.selectedStage, stageId: 12 } }],
        total: 1,
      },
    });
    await render();

    expect(links().every((link) => link.getAttribute('href')?.startsWith('/stages/12#'))).toBe(true);
    expect(
      [...(cards?.querySelectorAll('a[target="_blank"]') ?? [])].every((link) =>
        link.getAttribute('href')?.startsWith('/stages/12#'),
      ),
    ).toBe(true);
  });

  it('omits the warning without a start and all stage actions for completed projects', async () => {
    mocks.projects.mockReturnValue({
      data: {
        items: [
          { ...dashboardProject, selectedStage: { ...dashboardProject.selectedStage, plannedStartDate: null } },
          { ...dashboardProject, projectId: 8, status: 'completed', selectedStage: null },
        ],
        total: 2,
      },
    });
    await render();

    expect(container).not.toHaveTextContent('До старта ≤ 7 дней');
    expect(container.querySelectorAll(':scope tbody tr:last-child a')).toHaveLength(1);
    expect(container.querySelector(':scope tbody tr:last-child')).toHaveTextContent('Выполнен');
  });

  it('preserves server order, paginates and disables navigation during refresh', async () => {
    await render();
    const next = container.querySelector(':scope nav button:last-child') as HTMLButtonElement;

    await act(async () => {
      next.click();
      await Promise.resolve();
    });
    expect(mocks.page).toHaveBeenCalledWith(20);

    mocks.projects.mockReturnValue({ data: { items: [dashboardProject], total: 21 }, isFetching: true });
    await render();

    expect(next).toBeDisabled();
    expect(container).toHaveTextContent('Обновляем объекты…');

    mocks.projects.mockReturnValue({ data: { items: [], total: 21 }, isFetching: false });
    await render('2026-10-04', 60);

    expect(mocks.page).toHaveBeenCalledWith(20, true);
  });
});
