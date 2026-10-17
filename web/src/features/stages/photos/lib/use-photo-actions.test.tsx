// cspell:ignore unstub
import { act, useLayoutEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import type { ChecklistItemPhoto } from '@api/types';

import { usePhotoActions } from './use-photo-actions';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  remove: vi.fn(),
  invalidate: vi.fn(),
  access: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@api/clients/updateChecklistItem', () => ({
  updateChecklistItem: (...arguments_: unknown[]) => ({
    unwrap: () => mocks.update(...arguments_) as Promise<unknown>,
  }),
}));
vi.mock('@api/clients/deleteChecklistItemPhoto', () => ({
  deleteChecklistItemPhoto: (...arguments_: unknown[]) => ({
    unwrap: () => mocks.remove(...arguments_) as Promise<unknown>,
  }),
}));
vi.mock('@entities/stage', () => ({ invalidateStage: mocks.invalidate }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));

const probe = { actions: {} as ReturnType<typeof usePhotoActions> };

function ActionsProbe({ version }: { version: number }) {
  const data = editStage();
  const item = data.checklist.items[0];
  if (!item) throw new Error('Missing item');
  const actions = usePhotoActions(data.stage, item, version);

  useLayoutEffect(() => {
    probe.actions = actions;
  });

  return null;
}

describe('explicit checklist photo actions', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.resetAllMocks();
    mocks.update.mockResolvedValue({});
    mocks.remove.mockResolvedValue(undefined);
    mocks.invalidate.mockResolvedValue(undefined);
    container = document.createElement('div');
    root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <ActionsProbe version={8} />
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

  it('sends completion only on explicit action with the current version and prevents double submit', async () => {
    expect(mocks.update).not.toHaveBeenCalled();

    await act(async () => {
      await Promise.all([probe.actions.done(), probe.actions.done()]);
    });

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({
      path: { stageId: 11, itemId: 211 },
      body: { expectedVersion: 8, isCompleted: true },
    });
    expect(mocks.invalidate).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({
      to: '/stages/$stageId/checklist',
      params: { stageId: '11' },
    });
  });

  it('requires confirmation before removing completion with the final photo', async () => {
    const photo = { id: 99 } as ChecklistItemPhoto;
    mocks.remove.mockRejectedValueOnce({ status: 409, data: { code: 'photo_deletion_confirmation_required' } });

    await act(async () => {
      await probe.actions.remove(photo);
    });

    expect(probe.actions.confirmation).toBe(photo);
    expect(mocks.remove).toHaveBeenCalledTimes(1);

    await act(async () => {
      await probe.actions.remove(photo, true);
    });

    expect(mocks.remove).toHaveBeenLastCalledWith({ path: { photoId: 99 }, query: { confirmLastPhotoDeletion: true } });
    expect(probe.actions.confirmation).toBeUndefined();
  });

  it('shows version conflict and refreshes data without retrying completion', async () => {
    mocks.update.mockRejectedValueOnce({ status: 409, data: { code: 'version_conflict' } });

    await act(async () => {
      await probe.actions.done();
    });

    expect(probe.actions.error).toContain('Обновите');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.invalidate).toHaveBeenCalled();
  });
});
