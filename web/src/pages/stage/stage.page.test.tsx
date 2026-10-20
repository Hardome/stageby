// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { StagePage } from './stage.page';

const mocks = vi.hoisted(() => ({ role: 'foreman' }));
vi.mock('@shared/context', () => ({ useAuth: () => ({ user: { role: mocks.role } }) }));
vi.mock('@features/stages/edit', () => ({ StageEditor: () => <div>Редактор параметров</div> }));
vi.mock('@features/stages/view', () => ({
  StageOverview: ({
    backLink,
    actions,
  }: {
    backLink: (stage: ReturnType<typeof editStage>['stage']) => React.ReactNode;
    actions?: (stage: ReturnType<typeof editStage>['stage']) => React.ReactNode;
  }) => (
    <>
      {backLink(editStage().stage)}
      {actions?.(editStage().stage)}
    </>
  ),
}));
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => '',
  useSearch: () => ({ offset: 20 }),
  useNavigate: () => vi.fn(),
  Link: ({ to, params, children }: { to: string; params?: { projectId: string }; children?: React.ReactNode }) => (
    <a href={params ? `/projects/${params.projectId}` : to}>{children}</a>
  ),
}));

describe('stage page role navigation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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

  it.each(['manager', 'foreman'])('supports direct entry for %s', async (role) => {
    mocks.role = role;
    await act(async () => {
      root.render(<StagePage stageId="11" />);
      await Promise.resolve();
    });

    expect(container.querySelector('a')).toHaveAttribute('href', role === 'manager' ? '/projects/1' : '/my-stages');
    expect(container.textContent?.includes('Редактор параметров')).toBe(role === 'manager');
  });
});
