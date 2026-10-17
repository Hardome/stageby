// cspell:ignore unstub
import { act, type ReactNode } from 'react';

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
      href={
        to
          .split('$projectId')
          .join(params.projectId ?? '')
          .split('$stageId')
          .join(params.stageId ?? '') + (hash ? `#${hash}` : '')
      }
    >
      {children}
    </a>
  ),
}));

export function setupTest() {
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

  return {
    get container() {
      return container;
    },
    render,
  };
}

export { mocks };
