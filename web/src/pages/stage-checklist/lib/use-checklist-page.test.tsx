// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { useChecklistPage } from './use-checklist-page';

const mocks = vi.hoisted(() => ({ stage: vi.fn(), checklist: vi.fn(), access: vi.fn() }));
vi.mock('@api/queries/useGetStage', () => ({ useGetStage: mocks.stage }));
vi.mock('@api/queries/useGetStageChecklist', () => ({ useGetStageChecklist: mocks.checklist }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));

interface ProbeProperties {
  stageId: string;
  itemId: string;
}

function Probe({ stageId, itemId }: Readonly<ProbeProperties>) {
  const result = useChecklistPage(stageId, itemId);

  return <div>{result.notFound ? 'Недоступно' : result.item?.title}</div>;
}

describe('checklist page access', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    mocks.stage.mockReturnValue({ data: editStage().stage });
    mocks.checklist.mockReturnValue({ data: editStage().checklist });
  });
  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(itemId: string) {
    await act(async () => {
      root.render(<Probe stageId="11" itemId={itemId} />);
      await Promise.resolve();
    });
  }

  it('accepts a member item and rejects an item from another stage', async () => {
    await render('211');
    expect(container).toHaveTextContent('Армирование');
    await render('999');
    expect(container).toHaveTextContent('Недоступно');
  });

  it('does not request checklist data for an invalid item identifier', async () => {
    await render('bad');
    expect(mocks.checklist).toHaveBeenLastCalledWith(
      { path: { stageId: 11 } },
      { query: { enabled: false, retry: false } },
    );
    expect(container).toHaveTextContent('Недоступно');
  });

  it('does not request nested data before stage access is established', async () => {
    mocks.stage.mockReturnValue({ isLoading: true });
    mocks.checklist.mockReturnValue({});
    await render('211');
    expect(mocks.checklist).toHaveBeenLastCalledWith(
      { path: { stageId: 0 } },
      { query: { enabled: false, retry: false } },
    );
    expect(container).not.toHaveTextContent('Недоступно');
  });

  it('uses the same unavailable state for denied and missing resources', async () => {
    for (const status of [403, 404]) {
      mocks.stage.mockReturnValue({ error: { status } });
      mocks.checklist.mockReturnValue({});
      await render('211');
      expect(container).toHaveTextContent('Недоступно');
    }
    expect(mocks.access).toHaveBeenCalled();
  });
});
