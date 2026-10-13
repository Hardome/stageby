// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { EditProjectPage } from './edit-project.page';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), editor: vi.fn(), navigate: vi.fn(), blocker: vi.fn() }));
vi.mock('@shared/context', () => ({ useAuth: mocks.auth }));
vi.mock('@features/edit-project', () => ({ ProjectEditor: mocks.editor }));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useBlocker: mocks.blocker,
}));

describe('project editor route access', () => {
  let root: Root;
  let container: HTMLDivElement;
  async function render(projectId: string) {
    await act(async () => {
      root.render(<EditProjectPage projectId={projectId} />);
      await Promise.resolve();
    });
  }
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    mocks.auth.mockReturnValue({ user: { id: 1, role: 'manager' } });
    mocks.editor.mockReturnValue(<div>Редактор</div>);
    mocks.blocker.mockReturnValue({ status: 'idle' });
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
  it('does not load editing data for a foreman', async () => {
    mocks.auth.mockReturnValue({ user: { id: 2, role: 'foreman' } });
    await render('1');
    expect(container).toHaveTextContent('Нет доступа');
    expect(mocks.editor).not.toHaveBeenCalled();
  });
  it('rejects invalid IDs before mounting the data query', async () => {
    await render('1oops');
    expect(container).toHaveTextContent('Некорректная ссылка');
    expect(mocks.editor).not.toHaveBeenCalled();
  });
  it('loads a valid project for a manager', async () => {
    await render('17');
    expect(mocks.editor).toHaveBeenCalledWith(expect.objectContaining({ projectId: 17 }), undefined);
  });
});
