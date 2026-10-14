// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { ProjectCreator } from './project-creator';

const mocks = vi.hoisted(() => ({ query: vi.fn(), accessError: vi.fn(), refetch: vi.fn() }));
vi.mock('@api/queries/useListActiveStageTypes', () => ({ useListActiveStageTypes: mocks.query }));
vi.mock('@shared/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAccessError: () => mocks.accessError,
}));
vi.mock('./create-project-form', () => ({ CreateProjectForm: () => <div>Project form</div> }));

describe('project creation query states', () => {
  let container: HTMLDivElement;
  let root: Root;

  async function render(query: object) {
    mocks.query.mockReturnValue({ refetch: mocks.refetch, isFetching: false, ...query });
    await act(async () => {
      root.render(<ProjectCreator onCancel={() => {}} onDirtyChange={() => {}} onSuccess={() => Promise.resolve()} />);
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

  it('distinguishes first loading, empty data and ready form', async () => {
    await render({ isPending: true });
    expect(container.querySelector('[role="status"]')).toHaveAttribute('aria-label', 'Загрузка формы');
    await render({ isPending: false, data: [] });
    expect(container).toHaveTextContent('Нет активных типов этапов');
    await render({ isPending: false, data: [{ code: 'foundation' }] });
    expect(container).toHaveTextContent('Project form');
  });

  it('shows access errors and prevents repeated retry while fetching', async () => {
    const error = { status: 403 };
    await render({ isError: true, error, isFetching: true });
    expect(container).toHaveTextContent('404 — Страница не найдена');
    expect(mocks.accessError).toHaveBeenCalledWith(error);
    expect(container.querySelector('button')).toBeNull();

    await render({ isError: true, error: { status: 500 }, isFetching: true });
    expect(container.querySelector('button')).toBeDisabled();
    await render({ isError: true, error: { status: 500 } });
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('preserves the existing form during background refetch', async () => {
    await render({ data: [{ code: 'foundation' }], isFetching: true });
    expect(container).toHaveTextContent('Project form');
    expect(container.querySelector('[aria-label="Загрузка формы"]')).toBeNull();
  });
});
