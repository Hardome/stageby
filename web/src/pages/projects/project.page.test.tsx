// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { ProjectPage } from './project.page';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), view: vi.fn() }));
vi.mock('@shared/context', () => ({ useAuth: mocks.auth }));
vi.mock('@features/view-project', () => ({ ProjectView: mocks.view }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));

describe('project route access', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    mocks.view.mockReturnValue(<div>Объект</div>);
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
  it('does not mount data queries for foremen or malformed IDs', async () => {
    mocks.auth.mockReturnValue({ user: { role: 'foreman' } });
    await act(async () => {
      root.render(<ProjectPage projectId="1" />);
      await Promise.resolve();
    });
    expect(container).toHaveTextContent('Нет доступа');
    expect(mocks.view).not.toHaveBeenCalled();
    mocks.auth.mockReturnValue({ user: { role: 'manager' } });
    await act(async () => {
      root.render(<ProjectPage projectId="1oops" />);
      await Promise.resolve();
    });
    expect(container).toHaveTextContent('Некорректная ссылка');
    expect(mocks.view).not.toHaveBeenCalled();
  });
  it('mounts valid project without redundant navigation buttons', async () => {
    mocks.auth.mockReturnValue({ user: { role: 'manager' } });
    await act(async () => {
      root.render(<ProjectPage projectId="17" />);
      await Promise.resolve();
    });
    expect(mocks.view).toHaveBeenCalledWith({ projectId: 17 }, undefined);
    expect(container.querySelector('a')).toBeNull();
  });
});
