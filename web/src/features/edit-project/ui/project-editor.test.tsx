// cspell:ignore unstub
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { getProjectQueryKey } from '@api/queries/useGetProject';
import { getProjectEditQueryKey } from '@api/queries/useGetProjectEdit';
import { listProjectsQueryKey } from '@api/queries/useListProjects';
import type { ProjectEdit, UpdateProjectOptions } from '@api/types';

import { editSnapshot, editStage } from '../../../../tests/project-edit-fixture';
import { ProjectEditor } from './project-editor';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  update: vi.fn(),
  dirty: vi.fn(),
  success: vi.fn(),
  access: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('@api/clients/getProjectEdit', () => ({
  getProjectEdit: () => ({ unwrap: () => mocks.load() as Promise<ProjectEdit> }),
}));
vi.mock('@api/clients/updateProject', () => ({
  updateProject: (options: unknown) => ({ unwrap: () => mocks.update(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/listUsers', () => ({
  listUsers: () => ({ unwrap: () => Promise.resolve({ items: [], total: 0, offset: 0, limit: 20 }) }),
}));
vi.mock('@shared/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAccessError: () => mocks.access,
}));
vi.mock('../../../entities/project/lib/upload-document', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  uploadDocument: (...arguments_: unknown[]) => mocks.upload(...arguments_) as Promise<void>,
}));

async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}
function input(name: string) {
  const field = [...document.querySelectorAll('input')].find((element) => element.id === `project-${name}`);
  if (!(field instanceof HTMLInputElement)) throw new Error(`Missing input ${name}`);
  return field;
}

async function fill(name: string, value: string) {
  await flush(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input(name), value);
    input(name).dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(label: string) {
  const button = [...document.querySelectorAll<HTMLElement>('button, [role="checkbox"]')].find(
    (element) => element.textContent === label || element.getAttribute('aria-label') === label,
  );
  if (!button) throw new Error(`Missing button ${label}`);
  await flush(() => button.click());
}

describe('project editing workflow', () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let snapshot: ProjectEdit;
  async function submit() {
    await flush(() =>
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
  }
  async function render() {
    await flush(() =>
      root.render(
        <QueryClientProvider client={client}>
          <ProjectEditor projectId={1} onDirtyChange={mocks.dirty} onCancel={() => {}} onSuccess={mocks.success} />
        </QueryClientProvider>,
      ),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('scrollTo', vi.fn());
    vi.clearAllMocks();
    snapshot = editSnapshot();
    mocks.load.mockReset().mockResolvedValue(snapshot);
    mocks.update.mockReset().mockResolvedValue({ ...snapshot.project, version: 8 });
    mocks.upload.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await flush(() => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  });

  it('loads a fresh snapshot on reentry even when the cached snapshot is still fresh', async () => {
    client.setDefaultOptions({ queries: { retry: false, staleTime: Infinity } });
    await render();
    await flush(() => root.render(null));
    const pending = Promise.withResolvers<ProjectEdit>();
    mocks.load.mockReturnValueOnce(pending.promise);
    await render();
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('[aria-label="Загрузка редактора объекта"]')).not.toBeNull();
    const latest = editSnapshot();
    latest.project.ownerName = 'Мария';
    latest.project.version = 9;
    await flush(() => pending.resolve(latest));
    await vi.waitFor(() => expect(input('ownerName')).toHaveValue('Мария'));
    await fill('ownerName', 'Ольга');
    await submit();
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ body: { expectedVersion: 9, ownerName: 'Ольга' } }),
    );
  });

  it('does not open a cached form after the initial refresh fails and allows retrying', async () => {
    client.setQueryData(getProjectEditQueryKey({ path: { projectId: 1 } }), snapshot);
    mocks.load.mockRejectedValueOnce({ status: 500, data: {} });
    await render();
    expect(container.querySelector('form')).toBeNull();
    expect(container).toHaveTextContent('Не удалось загрузить объект.');
    const latest = editSnapshot();
    latest.project.isArchived = true;
    mocks.load.mockResolvedValueOnce(latest);
    await click('Повторить загрузку');
    await vi.waitFor(() => expect(container).toHaveTextContent('Объект в архиве'));
    expect(container.querySelector('form')).toBeNull();
  });

  it('closes an unchanged form without sending a PATCH', async () => {
    await render();
    await submit();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith(false);
    expect(container).not.toHaveTextContent('Проверьте отмеченные поля');
  });

  it('closes without a PATCH when edited values normalize to the original values', async () => {
    await render();
    await fill('ownerName', 'Мария');
    await fill('ownerName', ' Анна ');
    await fill('coordinates', '56.0,60.00');
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    await submit();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.success).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('prefills the form, preserves edits across background refresh and saves a partial PATCH', async () => {
    await render();
    expect(input('ownerName')).toHaveValue('Анна');
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
    await fill('ownerName', 'Мария');
    const latest = editSnapshot();
    latest.project.ownerName = 'Server change';
    await flush(() => client.setQueryData(getProjectEditQueryKey({ path: { projectId: 1 } }), latest));
    expect(input('ownerName')).toHaveValue('Мария');
    client.setQueryData(listProjectsQueryKey(), { items: [] });
    await submit();
    const options = mocks.update.mock.calls[0]?.[0] as UpdateProjectOptions;
    expect(options).toMatchObject({ path: { projectId: 1 }, body: { expectedVersion: 7, ownerName: 'Мария' } });
    expect(options.body).not.toHaveProperty('stages');
    expect(client.getQueryData(getProjectQueryKey({ path: { projectId: 1 } }))).toMatchObject({ id: 1, version: 8 });
    expect(client.getQueryState(listProjectsQueryKey())?.isInvalidated).toBe(true);
    expect(mocks.success).toHaveBeenCalledOnce();
  });

  it('restores excluded stages and keeps edited values across steps', async () => {
    await render();
    await click('Далее');
    expect(container.querySelector('#include-foundation')).toBeDisabled();
    await click('Включить этап «Стены»');
    expect(container.querySelector('#include-foundation')).not.toBeDisabled();
    await click('Заполнить этапы');
    await fill('stages.0.plannedWorkAmount', '0');
    await click('Следующий этап');
    expect(input('stages.1.checklistItems.0.title')).toHaveValue('Армирование');
    await click('Назад');
    expect(input('stages.0.plannedWorkAmount')).toHaveValue('0');
    await submit();
    const options = mocks.update.mock.calls[0]?.[0] as UpdateProjectOptions;
    expect(options.body.stages).toEqual([
      { id: 11, expectedVersion: 3, plannedWorkAmountMinor: 0n },
      { id: 12, expectedVersion: 3, isIncluded: true },
    ]);
  });

  it('shows started checklists read only and keeps stage plans editable', async () => {
    snapshot.stages[0] = editStage({ actualStartDate: '2026-10-05', status: 'in_progress' });
    await render();
    await click('Далее');
    expect(container).toHaveTextContent('Этап фактически начат');
    await click('Заполнить этапы');
    expect(input('stages.0.checklistItems.0.title')).toBeDisabled();
    expect(input('stages.0.plannedWorkAmount')).not.toBeDisabled();
    expect(container).not.toHaveTextContent('Добавить пункт');
  });

  it('preserves documents by ID, blocks incomplete uploads, retries and sends the final PDF list', async () => {
    await render();
    await click('Удалить PDF 1');
    const pending = Promise.withResolvers<void>();
    mocks.upload.mockReturnValueOnce(pending.promise);
    await flush(() => {
      const picker = input('documents');
      Object.defineProperty(picker, 'files', {
        configurable: true,
        value: [new File(['%PDF-1.7'], 'drawing.pdf', { type: 'application/pdf' })],
      });
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await submit();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    await flush(() => pending.reject(new Error('Ошибка сети')));
    mocks.upload.mockImplementationOnce((_item: unknown, update: (value: { fileId: number }) => void) => {
      update({ fileId: 90 });
      return Promise.resolve();
    });
    await click('Повторить');
    await submit();
    const options = mocks.update.mock.calls[0]?.[0] as UpdateProjectOptions;
    expect(options.body.documentFileIds).toEqual([82, 90]);
  });

  it('keeps input after version conflict and reloads only after reset confirmation', async () => {
    await render();
    await fill('ownerName', 'Мария');
    mocks.update.mockRejectedValueOnce({ status: 409, data: { code: 'version_conflict', message: 'Версия устарела' } });
    await submit();
    expect(input('ownerName')).toHaveValue('Мария');
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    await submit();
    expect(mocks.update).toHaveBeenCalledOnce();
    await click('Загрузить актуальные данные');
    await click('Оставить правки');
    expect(input('ownerName')).toHaveValue('Мария');
    const latest = editSnapshot();
    latest.project.ownerName = 'Сервер';
    latest.project.version = 9;
    mocks.load.mockResolvedValueOnce(latest);
    await click('Загрузить актуальные данные');
    await click('Сбросить и загрузить');
    expect(input('ownerName')).toHaveValue('Сервер');
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
    expect(container.querySelector('button[type="submit"]')).not.toBeDisabled();
  });

  it('maps server rejection of exclusion to the selection screen and preserves the reason', async () => {
    await render();
    await click('Далее');
    await click('Включить этап «Стены»');
    await click('Включить этап «Фундамент»');
    mocks.update.mockRejectedValueOnce({
      status: 400,
      data: {
        details: [
          {
            path: 'body.stages.0.isIncluded',
            message: 'Есть счета, выплаты или история фото.',
          },
        ],
      },
    });
    await submit();
    expect(container).toHaveTextContent('Выбор этапов');
    expect(container).toHaveTextContent('Есть счета, выплаты или история фото.');
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404])('handles %s without dropping entered values or repeating the PATCH', async (status) => {
    await render();
    await fill('ownerName', 'Мария');
    const error = { status, data: {} };
    mocks.update.mockRejectedValueOnce(error);
    await submit();
    expect(mocks.access).toHaveBeenCalledWith(error);
    expect(input('ownerName')).toHaveValue('Мария');
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it('disables archived objects and distinguishes a missing object from loading', async () => {
    snapshot.project.isArchived = true;
    await render();
    expect(container).toHaveTextContent('Объект в архиве');
    expect(container.querySelector('form')).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('prevents simultaneous submissions and keeps controls locked until completion', async () => {
    await render();
    await fill('ownerName', 'Мария');
    const pending = Promise.withResolvers<ProjectEdit['project']>();
    mocks.update.mockReturnValueOnce(pending.promise);
    await submit();
    await submit();
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(input('ownerName')).toBeDisabled();
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    await flush(() => pending.resolve({ ...snapshot.project, version: 8 }));
    expect(mocks.success).toHaveBeenCalledOnce();
  });

  it('focuses a server field error on the edited stage using the compact PATCH index', async () => {
    await render();
    await click('Далее');
    await click('Включить этап «Стены»');
    await click('Заполнить этапы');
    await click('Следующий этап');
    await fill('stages.1.plannedEndDate', '2026-10-25');
    mocks.update.mockRejectedValueOnce({
      status: 400,
      data: {
        details: [
          {
            path: 'body.stages.0.plannedEndDate',
            message: 'Срок изменился',
          },
        ],
      },
    });
    await submit();
    expect(container).toHaveTextContent('Срок изменился');
    await vi.waitFor(() => expect(input('stages.1.plannedEndDate')).toHaveFocus());
    expect(input('stages.1.plannedEndDate')).toHaveValue('2026-10-25');
  });

  it('reorders checklist items and rejects an empty included checklist', async () => {
    await render();
    await click('Далее');
    await click('Заполнить этапы');
    await click('Добавить пункт');
    await fill('stages.0.checklistItems.1.title', 'Проверить стены');
    await click('Поднять пункт 2');
    expect(input('stages.0.checklistItems.0.title')).toHaveValue('Проверить стены');
    await click('Удалить пункт 2');
    await click('Удалить пункт 1');
    await submit();
    expect(container).toHaveTextContent('Добавьте хотя бы один пункт');
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
