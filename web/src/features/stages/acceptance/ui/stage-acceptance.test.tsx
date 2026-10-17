// cspell:ignore unstub
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { getStageQueryKey } from '@api/queries/useGetStage';
import type { Stage } from '@api/types';

import { defaultCorrectionDate } from '../lib/rework-form';
import { StageAcceptance } from './stage-acceptance';

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  reject: vi.fn(),
  stage: vi.fn(),
  checklist: vi.fn(),
  invalidate: vi.fn(),
  access: vi.fn(),
  role: 'manager',
}));
vi.mock('@shared/context', () => ({ useAuth: () => ({ user: { role: mocks.role } }) }));
vi.mock('@shared/lib/hooks', async (original) => ({
  ...(await original<object>()),
  useAccessError: () => mocks.access,
}));
vi.mock('@entities/stage', () => ({ invalidateStage: mocks.invalidate }));
vi.mock('@api/clients/acceptStage', () => ({ acceptStage: mocks.accept }));
vi.mock('@api/clients/returnStageForRework', () => ({ returnStageForRework: mocks.reject }));
vi.mock('@api/clients/getStage', () => ({ getStage: mocks.stage }));
vi.mock('@api/clients/getStageChecklist', () => ({ getStageChecklist: mocks.checklist }));
vi.mock('@api/queries/useGetStageChecklist', async (original) => ({
  ...(await original<object>()),
  useGetStageChecklist: () => ({ data: editStage().checklist }),
}));

describe('stage acceptance actions', () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const stage = editStage({ status: 'acceptance' }).stage;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    mocks.role = 'manager';
    mocks.invalidate.mockResolvedValue(undefined);
    mocks.accept.mockReturnValue({ unwrap: () => Promise.resolve({ ...stage, status: 'completed', version: 4 }) });
    mocks.reject.mockReturnValue({ unwrap: () => Promise.resolve({ ...stage, status: 'rework', version: 4 }) });
    mocks.stage.mockReturnValue({ unwrap: () => Promise.resolve({ ...stage, version: 8 }) });
    mocks.checklist.mockReturnValue({ unwrap: () => Promise.resolve(editStage().checklist) });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    client.clear();
    vi.unstubAllGlobals();
  });

  async function render(current: Stage = stage) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <StageAcceptance stage={current} />
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });
  }

  async function click(text: string) {
    const button = [...container.querySelectorAll('button')].find((entry) => entry.textContent === text);
    if (!button) throw new Error(`Не найдена кнопка: ${text}`);

    await act(async () => {
      button.click();
      await Promise.resolve();
    });
  }

  async function fillRework() {
    await click('Вернуть на доработку');
    const textarea = container.querySelector('textarea');
    const checkbox = container.querySelector('[role="checkbox"]');
    if (!textarea || !(checkbox instanceof HTMLElement)) throw new Error('Нет полей доработки');

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(textarea, 'Исправить угол');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      checkbox.click();
      await Promise.resolve();
    });
  }

  it('accepts using only the current version, updates the cache and blocks another submission', async () => {
    await render();
    await click('Подтвердить приёмку');
    await click('Подтвердить приёмку');

    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(mocks.accept).toHaveBeenCalledWith({ path: { stageId: 11 }, body: { expectedVersion: 3 } });
    expect(client.getQueryData(getStageQueryKey({ path: { stageId: 11 } }))).toMatchObject({ status: 'completed' });
    expect(mocks.invalidate).toHaveBeenCalledWith(client, expect.objectContaining({ status: 'completed' }));
  });

  it('requires a comment and selected points before returning the stage', async () => {
    await render();
    await click('Вернуть на доработку');
    await click('Отправить замечания');

    expect(mocks.reject).not.toHaveBeenCalled();
    expect(container.querySelector('textarea')).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('[role="checkbox"]')).toHaveAttribute('aria-invalid', 'true');
  });

  it('preserves input after conflict and uses the refreshed version on retry', async () => {
    mocks.reject.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject(Object.assign(new Error('Конфликт'), { status: 409, data: { code: 'version_conflict' } })),
    });
    await render();
    await fillRework();
    await click('Отправить замечания');

    expect(container.querySelector('textarea')).toHaveValue('Исправить угол');
    expect(container).toHaveTextContent('Обновите их');

    await click('Отправить замечания');
    expect(mocks.reject).toHaveBeenCalledTimes(1);

    await click('Обновить данные');
    await render({ ...stage, version: 8 });
    await click('Отправить замечания');

    expect(mocks.reject).toHaveBeenLastCalledWith({
      path: { stageId: 11 },
      body: {
        expectedVersion: 8,
        comment: 'Исправить угол',
        itemIds: [211],
        correctionDueDate: defaultCorrectionDate(),
      },
    });
    expect(mocks.invalidate).toHaveBeenCalledWith(client, expect.objectContaining({ status: 'rework' }));
  });

  it('shows the decision author and deadline to the foreman without manager actions', async () => {
    mocks.role = 'foreman';
    await render({
      ...stage,
      status: 'rework',
      latestAcceptance: {
        decision: 'rejected',
        comment: 'Исправить угол',
        correctionDueDate: '2026-10-18',
        decidedBy: { id: 1, fullName: 'Руководитель' },
        decidedAt: '2026-10-16T20:00:00Z',
      },
    });

    expect(container).toHaveTextContent('Руководитель');
    expect(container).toHaveTextContent('18.10.2026');
    expect(container).toHaveTextContent('Исправить угол');
    expect(container.querySelector('button')).toBeNull();
  });

  it.each([{ projectIsArchived: true }, { isIncluded: false }, { status: 'paid' as const }])(
    'hides actions when the stage is unavailable: %j',
    async (changes) => {
      await render({ ...stage, ...changes });

      expect(container.querySelector('button')).toBeNull();
    },
  );
});
