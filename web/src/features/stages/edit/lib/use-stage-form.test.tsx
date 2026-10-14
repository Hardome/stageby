// cspell:ignore unstub
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';
import { StageFormProbe } from '@tests/stage-form-probe';

import type { Stage } from '@api/types';

import type { useStageForm } from './use-stage-form';

const mocks = vi.hoisted(() => ({ update: vi.fn(), read: vi.fn(), access: vi.fn(), invalidate: vi.fn() }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));
vi.mock('@entities/stage', () => ({ invalidateStage: mocks.invalidate }));
vi.mock('@api/clients/getStage', () => ({ getStage: () => ({ unwrap: () => mocks.read() as Promise<Stage> }) }));
vi.mock('@api/mutations/useUpdateStage', () => ({
  useUpdateStage: ({
    mutation,
  }: {
    mutation: {
      onSuccess: (stage: Stage) => Promise<void>;
      onError: (error: unknown) => void;
    };
  }) => ({
    isPending: false,
    mutateAsync: async (request: unknown) => {
      try {
        const updated = (await mocks.update(request)) as Stage;
        await mutation.onSuccess(updated);
      } catch (error) {
        mutation.onError(error);
        throw error;
      }
    },
  }),
}));

describe('stage form saving', () => {
  let container: HTMLDivElement;
  let root: Root;
  let editor: ReturnType<typeof useStageForm>;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <StageFormProbe
            onEditor={(value) => {
              editor = value;
            }}
          />
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function submit() {
    await act(async () => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  }

  it('preserves input through conflict and reload, then saves against fresh version', async () => {
    mocks.update.mockRejectedValueOnce({ status: 409, data: { code: 'version_conflict' } });
    await act(async () => {
      editor.form.setValue('plannedMaterialAmountMinor', '500');
      await Promise.resolve();
    });

    await submit();
    expect(editor.needsReload).toBe(true);
    expect(editor.form.getValues('plannedMaterialAmountMinor')).toBe('500');
    await submit();
    expect(mocks.update).toHaveBeenCalledTimes(1);

    const updated = editStage({ version: 8, plannedEndDate: '2026-11-01', assignee: null }).stage;
    mocks.read.mockResolvedValue(updated);
    await act(async () => editor.reload());

    expect(editor.needsReload).toBe(false);
    expect(editor.form.getValues('plannedMaterialAmountMinor')).toBe('500');
    expect(editor.form.getValues('plannedEndDate')).toBe('2026-11-01');
    expect(editor.form.getValues('assignee')).toBeNull();
    mocks.update.mockResolvedValue({ ...updated, version: 9, plannedMaterialAmountMinor: 50000n });
    await submit();

    expect(mocks.update).toHaveBeenLastCalledWith({
      path: { stageId: 11 },
      body: { expectedVersion: 8, plannedMaterialAmountMinor: 50000n },
    });
    expect(mocks.invalidate).toHaveBeenCalled();
    expect(editor.message).toBe('Параметры сохранены.');
  });

  it('retains input on failed save and refreshes session on denied access', async () => {
    mocks.update.mockRejectedValue({ status: 403, data: { message: 'Ошибка' } });
    await act(async () => {
      editor.form.setValue('assignee', null);
      await Promise.resolve();
    });

    await submit();

    expect(editor.form.getValues('assignee')).toBeNull();
    expect(editor.unavailable).toBe(true);
    expect(mocks.access).toHaveBeenCalled();
  });
});
