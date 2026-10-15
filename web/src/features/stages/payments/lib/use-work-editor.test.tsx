// cspell:ignore unstub
import { act, useLayoutEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';
import { workRow } from '@tests/work-payment-data';

import type { WorkEditorProperties } from '../model/types';
import { useWorkEditor } from './use-work-editor';

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  invalidate: vi.fn(),
  stage: vi.fn(),
  reload: vi.fn(),
  close: vi.fn(),
}));
vi.mock('./execute-work-action', () => ({ executeWorkAction: mocks.execute }));
vi.mock('./invalidate-work', () => ({ invalidateWork: mocks.invalidate }));
vi.mock('./reload-work-action', () => ({ reloadWorkAction: mocks.reload }));
vi.mock('./use-work-recipient', () => ({ useWorkRecipient: vi.fn() }));
vi.mock('@api/clients/getStage', () => ({ getStage: mocks.stage }));
vi.mock('@shared/lib/hooks', async (original) => ({
  ...(await original<object>()),
  useAccessError: () => vi.fn(),
}));

const probe = { editor: {} as ReturnType<typeof useWorkEditor> };

function EditorProbe(properties: WorkEditorProperties) {
  const editor = useWorkEditor(properties);
  useLayoutEffect(() => {
    probe.editor = editor;
  });

  return null;
}

describe('payment saving and conflicts', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    mocks.execute.mockResolvedValue(undefined);
    mocks.invalidate.mockResolvedValue(undefined);
    mocks.stage.mockReturnValue({ unwrap: () => Promise.resolve(editStage().stage) });
    mocks.reload.mockResolvedValue({ kind: 'row', row: workRow({ version: 8 }) });
    container = document.createElement('div');
    root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <EditorProbe stage={editStage().stage} action={{ kind: 'row', row: workRow() }} onClose={mocks.close} />
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
    vi.unstubAllGlobals();
  });

  it('blocks duplicate submission until the first request and invalidation finish', async () => {
    const { promise, resolve } = Promise.withResolvers<void>();
    mocks.execute.mockReturnValue(promise);

    await act(async () => {
      probe.editor.form.setValue('amount', '95');
      const first = probe.editor.submit(probe.editor.form.getValues());
      await probe.editor.submit(probe.editor.form.getValues());
      resolve();
      await first;
    });

    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(mocks.invalidate).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('closes unchanged edits without a mutation or cache refresh', async () => {
    await act(async () => {
      probe.editor.form.setValue('amount', '95');
      probe.editor.form.setValue('amount', '100');
      await probe.editor.submit(probe.editor.form.getValues());
    });

    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('preserves input and blocks saving until the conflicting version is refreshed', async () => {
    mocks.execute.mockRejectedValueOnce({
      status: 409,
      data: {
        error: 'Conflict',
        code: 'version_conflict',
        message: 'Версия устарела.',
      },
    });

    await act(async () => {
      probe.editor.form.setValue('amount', '95');
      await probe.editor.submit(probe.editor.form.getValues());
    });

    expect(probe.editor.needsReload).toBe(true);
    expect(probe.editor.form.getValues('amount')).toBe('95');
    await act(async () => {
      await probe.editor.submit(probe.editor.form.getValues());
    });
    expect(mocks.execute).toHaveBeenCalledTimes(1);

    await act(async () => {
      await probe.editor.reload();
    });

    expect(probe.editor.needsReload).toBe(false);
    expect(probe.editor.form.getValues('amount')).toBe('95');

    await act(async () => {
      await probe.editor.submit(probe.editor.form.getValues());
    });

    expect(mocks.execute).toHaveBeenLastCalledWith(11, expect.anything(), expect.objectContaining({ amount: '95' }), 8);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });

  it('keeps a paid-stage refusal visible without closing the form or clearing input', async () => {
    mocks.execute.mockRejectedValueOnce({
      status: 409,
      data: {
        error: 'Conflict',
        code: 'invalid_transition',
        message: 'Остаток выплаченного этапа не может быть положительным.',
      },
    });

    await act(async () => {
      probe.editor.form.setValue('amount', '95');
      await probe.editor.submit(probe.editor.form.getValues());
    });

    expect(probe.editor.message).toContain('Остаток выплаченного этапа');
    expect(probe.editor.form.getValues('amount')).toBe('95');
    expect(mocks.close).not.toHaveBeenCalled();
  });
});
