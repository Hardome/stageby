// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { StageAssigneeWarning } from './stage-assignee-warning';

vi.mock('@shared/context', () => ({ useAuth: () => ({ user: { role: 'manager' } }) }));
vi.mock('@features/stages/edit', () => ({
  StageEditor: ({ trigger, focusAssignee }: { trigger: React.ReactNode; focusAssignee: boolean }) => (
    <div data-testid="editor" data-focus-assignee={focusAssignee}>
      {trigger}
    </div>
  ),
}));

describe('stage assignee warning', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    vi.unstubAllGlobals();
  });

  async function render(overrides: Parameters<typeof editStage>[0]) {
    await act(async () => {
      root.render(<StageAssigneeWarning stage={editStage(overrides).stage} purpose="work" />);
      await Promise.resolve();
    });
  }

  it('offers to assign a foreman for payments using the stage editor', async () => {
    await render({ assignee: null });

    expect(container.querySelector('[role="alert"]')).toHaveTextContent('Чтобы добавить выплату, назначьте мастера.');
    expect(container.querySelector('button')).toHaveTextContent('назначьте мастера');
    expect(container.querySelector('[data-testid="editor"]')).toHaveAttribute('data-focus-assignee', 'true');
  });

  it.each([{ projectIsArchived: true, assignee: null }, { isIncluded: false, assignee: null }, {}])(
    'hides the warning when assignment is unnecessary or unavailable: %j',
    async (overrides) => {
      await render(overrides);

      expect(container).toBeEmptyDOMElement();
    },
  );
});
