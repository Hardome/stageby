// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { TemporaryProjectList } from './temporary-project-list';

const mocks = vi.hoisted(() => ({ query: vi.fn(), access: vi.fn(), retry: vi.fn(), page: vi.fn() }));
vi.mock('@api/queries/useListProjects', () => ({ useListProjects: mocks.query }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, params }: { children: React.ReactNode; params: { projectId: string } }) => (
    <a href={`/projects/${params.projectId}`}>{children}</a>
  ),
}));

describe('temporary project list', () => {
  let root: Root;
  let container: HTMLDivElement;
  async function render(query: object, offset = 0) {
    mocks.query.mockReturnValue({ refetch: mocks.retry, ...query });
    await act(async () => {
      root.render(<TemporaryProjectList search={{ offset }} onPageChange={mocks.page} />);
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
  it('shows loading, empty result and retry after access error', async () => {
    await render({ isPending: true });
    expect(container.querySelector('[role="status"]')).toHaveAttribute('aria-label', 'Загрузка объектов');
    await render({ data: { items: [], total: 0 } });
    expect(container).toHaveTextContent('Объектов пока нет');
    const error = { status: 403 };
    await render({ isError: true, error });
    expect(mocks.access).toHaveBeenCalledWith(error);
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });
    expect(mocks.retry).toHaveBeenCalledOnce();
  });
  it('opens projects, changes pages and disables pagination during refetch', async () => {
    const data = {
      total: 21,
      items: [
        {
          id: 7,
          ownerName: 'Анна',
          address: 'Лесная, 10',
          status: 'created',
          plannedStartDate: '2026-10-01',
          plannedEndDate: '2026-12-01',
        },
      ],
    };
    await render({ data });
    expect(container.querySelector('a')).toHaveAttribute('href', '/projects/7');
    const next = container.querySelector(':scope nav button:last-child') as HTMLButtonElement;
    await act(async () => {
      next.click();
      await Promise.resolve();
    });
    expect(mocks.page).toHaveBeenCalledWith(20);
    await render({ data, isFetching: true });
    expect(container.querySelector('section')).toHaveAttribute('aria-busy', 'true');
    expect(next).toBeDisabled();
    expect(container).toHaveTextContent('Анна');
  });
  it('replaces out-of-range offsets with the final existing page', async () => {
    await render({ data: { total: 21, items: [] } }, 60);
    expect(mocks.page).toHaveBeenCalledWith(20, true);
    expect(mocks.query).toHaveBeenCalledWith({ query: { limit: 20, offset: 60 } }, expect.anything());
  });
});
