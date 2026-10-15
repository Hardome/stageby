// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { StageOverview } from './stage-overview';

const mocks = vi.hoisted(() => ({ stage: vi.fn(), checklist: vi.fn(), access: vi.fn(), retry: vi.fn() }));
vi.mock('@api/queries/useGetStage', () => ({ useGetStage: mocks.stage }));
vi.mock('@api/queries/useGetStageChecklist', () => ({ useGetStageChecklist: mocks.checklist }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));

const paymentDraft = () => <input aria-label="Черновик платежа" defaultValue="95" />;

describe('stage overview', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
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

  async function render(query: object, stageId = '11') {
    mocks.stage.mockReturnValue({ refetch: mocks.retry, ...query });
    await act(async () => {
      root.render(<StageOverview stageId={stageId} />);
      await Promise.resolve();
    });
  }

  it('preserves payment fields after a background refresh failure', async () => {
    const data = editStage().stage;
    mocks.stage.mockReturnValue({ data, refetch: mocks.retry });

    await act(async () => {
      root.render(<StageOverview stageId="11" payments={paymentDraft} />);
      await Promise.resolve();
    });
    const input = container.querySelector('input');

    mocks.stage.mockReturnValue({ data, error: { status: 500 }, refetch: mocks.retry });
    await act(async () => {
      root.render(<StageOverview stageId="11" payments={paymentDraft} />);
      await Promise.resolve();
    });

    expect(container).toHaveTextContent('Не удалось обновить этап.');
    expect(container.querySelector('input')).toBe(input);
    expect(input).toHaveValue('95');
  });

  it('rejects malformed identifiers and hides unavailable stages', async () => {
    await render({ isPending: true }, 'invalid');
    expect(mocks.stage).toHaveBeenCalledWith({ path: { stageId: 0 } }, { query: { enabled: false, retry: false } });
    expect(container).toHaveTextContent('404 — Страница не найдена');

    for (const status of [403, 404]) {
      await render({ error: { status } });
      expect(container).toHaveTextContent('404 — Страница не найдена');
      expect(container).not.toHaveTextContent('Фундамент');
    }
    expect(mocks.access).toHaveBeenCalled();
  });

  it('shows loading and retry without treating failures as missing documents', async () => {
    await render({ isPending: true });
    expect(container.querySelector('[role="status"]')).toHaveAttribute('aria-label', 'Загрузка этапа');

    await render({ error: { status: 500 } });
    expect(container).not.toHaveTextContent('Проект не загружен');
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });
    expect(mocks.retry).toHaveBeenCalled();
  });

  it('uses stage context, ordered blocks and checklist warnings', async () => {
    const { stage, checklist } = editStage({
      position: 5,
      includedStageNumber: 2,
      includedStageCount: 3,
      assignee: { id: 4, fullName: 'Иван', phone: '+79000000000' },
      projectDocumentFileIds: [71],
      workBalanceAmountMinor: -10000n,
    });
    mocks.checklist.mockReturnValue({ data: { ...checklist, warnings: ['predecessor_incomplete'] } });

    await render({ data: stage, isFetching: true });

    expect(container).toHaveTextContent('Этап 2 из 3');
    expect(container.querySelector('a')).toHaveAttribute('href', 'tel:+79000000000');
    expect(container.querySelector('button')).toHaveAttribute('aria-label', 'Открыть PDF 1');
    expect(container).toHaveTextContent('Предыдущий этап ещё не выполнен');
    expect(container).toHaveTextContent('Переплата');
    expect([...container.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      'Чек-лист',
      'Проект',
      'Материалы',
      'Оплата работ',
    ]);
    expect(container.querySelector('header')).toHaveAttribute('aria-busy', 'true');

    await render({ error: { status: 404 } });
    expect(container).not.toHaveTextContent('Иван');
  });
});
