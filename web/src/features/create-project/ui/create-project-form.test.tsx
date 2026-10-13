import type { ComponentProps } from 'react';
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { useFormState } from 'react-hook-form';

import { getProjectQueryKey } from '@api/queries/useGetProject';
import type { ActiveStageType } from '@api/types';

import { CreateProjectForm } from './create-project-form';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  success: vi.fn(),
  dirty: vi.fn(),
  accessError: vi.fn(),
  upload: vi.fn(),
}));
vi.mock('../../../entities/project/lib/upload-document', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  uploadDocument: (...arguments_: unknown[]) => mocks.upload(...arguments_) as Promise<void>,
}));
vi.mock('@api/clients/createProject', () => ({
  createProject: (...arguments_: unknown[]) => ({ unwrap: () => mocks.create(...arguments_) as Promise<unknown> }),
}));
vi.mock('@api/clients/listUsers', () => ({
  listUsers: () => ({ unwrap: () => Promise.resolve({ items: [], total: 0, offset: 0, limit: 20 }) }),
}));
vi.mock('@shared/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAccessError: () => mocks.accessError,
}));
vi.mock('./project-actions', async (importOriginal) => {
  const { ProjectActions } = await importOriginal<typeof import('./project-actions')>();
  return {
    ProjectActions: (properties: ComponentProps<typeof ProjectActions>) => {
      const { isSubmitting } = useFormState();
      return (
        <div data-form-submitting={isSubmitting}>
          <ProjectActions {...properties} />
        </div>
      );
    },
  };
});

const types: ActiveStageType[] = [
  {
    code: 'foundation',
    title: 'Фундамент',
    position: 1,
    checklistTemplateId: 1,
    checklistItems: [{ id: 1, title: 'Армирование', photoHint: 'Фото углов', position: 1 }],
  },
];

async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

describe('project creation workflow', () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  function input(name: string) {
    const element = [...container.querySelectorAll('input')].find((field) => field.id === `project-${name}`);
    if (!element) throw new Error(`Missing input ${name}`);
    return element;
  }
  async function fill(name: string, value: string) {
    await flush(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input(name), value);
      input(name).dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  async function submit() {
    await flush(() =>
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
  }
  async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find((element) => element.textContent === label);
    if (!button) throw new Error(`Missing button ${label}`);
    await flush(() => button.click());
  }
  async function clickStep(step: number) {
    const button = container.querySelectorAll<HTMLButtonElement>(':scope ol[aria-label="Шаги создания"] button')[
      step - 1
    ];
    if (!button) throw new Error('Missing step button');
    await flush(() => button.click());
  }
  async function objectStep(shouldOpenStage = true) {
    await fill('ownerName', 'Иван Иванов');
    await fill('address', 'Екатеринбург');
    await fill('coordinates', '56.8, 60.6');
    await fill('plannedStartDate', '2026-10-05');
    await fill('plannedEndDate', '2026-12-31');
    await submit();
    if (shouldOpenStage) await click('Заполнить этапы');
  }
  async function stageDates() {
    await fill('stages.0.plannedStartDate', '2026-10-05');
    await fill('stages.0.plannedEndDate', '2026-10-31');
  }
  async function renderForm(stageTypes = types, formKey = 'default') {
    await flush(() =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <CreateProjectForm
            key={formKey}
            types={stageTypes}
            onDirtyChange={mocks.dirty}
            onCancel={() => {}}
            onSuccess={mocks.success}
          />
        </QueryClientProvider>,
      ),
    );
  }
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    mocks.create.mockReset();
    mocks.success.mockReset();
    mocks.dirty.mockReset();
    mocks.upload.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    await renderForm();
  });
  afterEach(async () => {
    await flush(() => root.unmount());
    queryClient.clear();
    container.remove();
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it('shows and clears field errors on change before submitting either step', async () => {
    await fill('ownerName', ' ');
    expect(input('ownerName')).toHaveAttribute('aria-invalid', 'true');
    expect(container.textContent).toContain('Укажите клиента.');
    await fill('ownerName', 'Иван Иванов');
    expect(input('ownerName')).toHaveAttribute('aria-invalid', 'false');
    expect(container.textContent).not.toContain('Укажите клиента.');
    await objectStep();
    await fill('stages.0.plannedEndDate', '2027-01-01');
    expect(input('stages.0.plannedEndDate')).toHaveAttribute('aria-invalid', 'true');
    expect(container.textContent).toContain('Дата должна находиться внутри сроков проекта.');
    await fill('stages.0.plannedEndDate', '2026-10-31');
    expect(input('stages.0.plannedEndDate')).toHaveAttribute('aria-invalid', 'false');
    expect(container.textContent).not.toContain('Дата должна находиться внутри сроков проекта.');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('formats both stage plans, retains them across steps and submits exact minor amounts', async () => {
    await objectStep();
    await stageDates();
    await fill('stages.0.plannedWorkAmount', '1000000');
    await fill('stages.0.plannedMaterialAmount', '2\u{A0}500\u{A0}000');
    expect(input('stages.0.plannedWorkAmount')).toHaveValue('1 000 000');
    expect(input('stages.0.plannedMaterialAmount')).toHaveValue('2 500 000');
    await click('Назад');
    await click('Заполнить этапы');
    expect(input('stages.0.plannedWorkAmount')).toHaveValue('1 000 000');
    expect(input('stages.0.plannedMaterialAmount')).toHaveValue('2 500 000');
    await fill('stages.0.plannedWorkAmount', '-1');
    expect(input('stages.0.plannedWorkAmount')).toHaveAttribute('aria-invalid', 'true');
    await fill('stages.0.plannedWorkAmount', '1000000');
    expect(input('stages.0.plannedWorkAmount')).toHaveAttribute('aria-invalid', 'false');
    mocks.create.mockResolvedValueOnce({ id: 77 });
    await submit();
    const request = mocks.create.mock.calls[0]?.[0] as {
      body: { stages: { plannedWorkAmountMinor: bigint; plannedMaterialAmountMinor: bigint }[] };
    };
    expect(request.body.stages[0]).toMatchObject({
      plannedWorkAmountMinor: 100000000n,
      plannedMaterialAmountMinor: 250000000n,
    });
  });
  it('retains uploads across steps, blocks unfinished files and submits completed file IDs', async () => {
    const pending = Promise.withResolvers<void>();
    mocks.upload.mockReturnValueOnce(pending.promise);
    await flush(() => {
      const picker = input('documents');
      Object.defineProperty(picker, 'files', {
        value: [new File(['%PDF-1.7'], 'drawing.pdf', { type: 'application/pdf' })],
        configurable: true,
      });
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('drawing.pdf');
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    await objectStep();
    await stageDates();
    await submit();
    expect(mocks.create).not.toHaveBeenCalled();
    await click('Назад');
    await click('Назад');
    expect(container.textContent).toContain('drawing.pdf');
    await flush(() => {
      pending.reject(new Error('Ошибка сети'));
    });
    expect(container.textContent).toContain('Ошибка сети');
    mocks.upload.mockImplementationOnce((_item: unknown, update: (values: { fileId: number }) => void) => {
      update({ fileId: 41 });
      return Promise.resolve();
    });
    await click('Повторить');
    expect(container.textContent).toContain('Загружен');
    await submit();
    mocks.create.mockResolvedValueOnce({ id: 77 });
    await submit();
    const request = mocks.create.mock.calls[0]?.[0] as { body: { documentFileIds: number[] } };
    expect(request.body.documentFileIds).toEqual([41]);
  });
  it('validates the first step before allowing stage configuration', async () => {
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(container.textContent).not.toContain('Создать объект');
    await submit();
    expect(input('ownerName').getAttribute('aria-invalid')).toBe('true');
    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Включено этапов:');
  });
  it('allows the next step with empty stage dates without showing their errors', async () => {
    await objectStep();
    expect(container.textContent).toContain('Этап 1 из 1.');
    expect(input('stages.0.plannedStartDate')).toHaveValue('');
    expect(input('stages.0.plannedStartDate')).toHaveAttribute('aria-invalid', 'false');
    expect(container.textContent).not.toContain('Укажите дату этапа.');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('focuses on each failed attempt without stealing focus while editing', async () => {
    await submit();
    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
    await flush(() => input('address').focus());
    await fill('address', 'Екатеринбург');
    await vi.waitFor(() => expect(input('address')).toHaveFocus());
    await submit();
    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
  });
  it('focuses the visible object error when a hidden stage also has errors', async () => {
    await objectStep();
    await fill('stages.0.checklistItems.0.title', ' ');
    await clickStep(1);
    await fill('ownerName', ' ');
    await submit();
    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
  });
  it('mounts and focuses a nested checklist field when submitting from selection', async () => {
    await objectStep();
    await fill('stages.0.checklistItems.0.title', ' ');
    await click('Назад');
    await submit();
    await vi.waitFor(() => expect(input('stages.0.checklistItems.0.title')).toHaveFocus());
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('creates from stage selection without opening stage editors', async () => {
    await objectStep(false);
    expect(container.querySelector('[id="project-stages.0.plannedStartDate"]')).toBeNull();
    mocks.create.mockResolvedValueOnce({ id: 77 });
    await submit();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      body: { stages: [{ plannedStartDate: null, plannedEndDate: null }] },
    });
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });
  it('opens and focuses the first invalid stage when creating from selection', async () => {
    await objectStep();
    await fill('stages.0.plannedEndDate', '2027-01-01');
    await click('Назад');
    await submit();
    expect(input('stages.0.plannedEndDate')).toHaveAttribute('aria-invalid', 'true');
    await vi.waitFor(() => expect(input('stages.0.plannedEndDate')).toHaveFocus());
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Дата должна находиться внутри сроков проекта.');
  });
  it('validates project date order and focuses the end date on the first step', async () => {
    await fill('ownerName', 'Иван Иванов');
    await fill('address', 'Екатеринбург');
    await fill('coordinates', '56.8, 60.6');
    await fill('plannedStartDate', '2026-10-05');
    await fill('plannedEndDate', '2026-10-04');
    await submit();
    expect(container.textContent).toContain('Окончание проекта не может быть раньше начала.');
    await vi.waitFor(() => expect(input('plannedEndDate')).toHaveFocus());
    expect(container.textContent).not.toContain('Включено этапов:');
    await fill('plannedEndDate', '2026-12-31');
    await submit();
    expect(container.textContent).toContain('Включено этапов:');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('leaves stage dates empty and retains edited checklist across steps and template refresh', async () => {
    await objectStep();
    expect(input('stages.0.plannedStartDate').value).toBe('');
    await fill('stages.0.checklistItems.0.title', 'Индивидуальный пункт');
    await stageDates();
    await click('Назад');
    await click('Назад');
    expect(input('ownerName').value).toBe('Иван Иванов');
    await renderForm([{ ...(types[0] as ActiveStageType), checklistItems: [] }]);
    await submit();
    await click('Заполнить этапы');
    expect(input('stages.0.checklistItems.0.title').value).toBe('Индивидуальный пункт');
    expect(input('stages.0.plannedStartDate').value).toBe('2026-10-05');
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
  });
  it('updates stage summaries on inclusion changes and retains edited fields when re-enabled', async () => {
    await objectStep();
    await stageDates();
    await fill('stages.0.checklistItems.0.title', 'Индивидуальный пункт');
    await click('Назад');
    const checkbox = container.querySelector<HTMLElement>('#include-foundation');
    if (!checkbox) throw new Error('Missing stage checkbox');
    await flush(() => checkbox.click());
    expect(container.textContent).toContain('Включено этапов: 0 из 1.');
    await submit();
    expect(container.textContent).toContain('Включите хотя бы один этап.');
    expect(mocks.create).not.toHaveBeenCalled();
    await flush(() => checkbox.click());
    expect(container.textContent).toContain('Включено этапов: 1 из 1.');
    await click('Заполнить этапы');
    expect(input('stages.0.checklistItems.0.title')).toHaveValue('Индивидуальный пункт');
    expect(input('stages.0.plannedStartDate')).toHaveValue('2026-10-05');
  });
  it('displays an array error when the last checklist item is removed', async () => {
    await objectStep();
    await stageDates();
    const remove = container.querySelector<HTMLButtonElement>('button[aria-label="Удалить пункт 1"]');
    if (!remove) throw new Error('Missing checklist remove button');
    await flush(() => remove.click());
    await submit();
    expect(container.textContent).toContain('Добавьте хотя бы один пункт.');
    expect(mocks.create).not.toHaveBeenCalled();
    await click('Добавить пункт');
    await fill('stages.0.checklistItems.0.title', 'Новый пункт');
    expect(container.textContent).not.toContain('Добавьте хотя бы один пункт.');
  });
  it('retries the same request and key after a lost response and updates the cache', async () => {
    await objectStep();
    await stageDates();
    mocks.create.mockRejectedValueOnce(new Error('Network error'));
    await submit();
    expect(container.textContent).toContain('Повторить');
    expect(input('stages.0.plannedStartDate').disabled).toBe(true);
    for (const button of container.querySelectorAll(':scope ol[aria-label="Шаги создания"] button'))
      expect(button).toBeDisabled();
    const firstRequest: unknown = mocks.create.mock.calls[0]?.[0];
    expect(firstRequest).toMatchObject({ body: { ownerName: 'Иван Иванов', documentFileIds: [] } });
    const project = { id: 77 };
    mocks.create.mockResolvedValueOnce(project);
    mocks.success.mockImplementation(() => {
      expect(queryClient.getQueryData(getProjectQueryKey({ path: { projectId: 77 } }))).toEqual(project);
    });
    await submit();
    expect(mocks.create.mock.calls[1]?.[0]).toEqual(firstRequest);
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });
  it('keeps RHF submitting until the request and completion finish and prevents duplicate requests', async () => {
    await objectStep();
    await stageDates();
    const request = Promise.withResolvers<{ id: number }>();
    const completion = Promise.withResolvers<void>();
    mocks.create.mockReturnValueOnce(request.promise);
    mocks.success.mockReturnValueOnce(completion.promise);
    await submit();
    expect(container.querySelector('[data-form-submitting]')).toHaveAttribute('data-form-submitting', 'true');
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    await submit();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await flush(() => request.resolve({ id: 77 }));
    expect(mocks.success).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-form-submitting]')).toHaveAttribute('data-form-submitting', 'true');
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
    await flush(() => completion.resolve());
    expect(container.querySelector('[data-form-submitting]')).toHaveAttribute('data-form-submitting', 'false');
  });
  it('unlocks the form and displays field errors after definite validation rejection', async () => {
    await objectStep();
    await stageDates();
    mocks.create.mockRejectedValueOnce({
      status: 400,
      data: { details: [{ path: 'body.stages.0.plannedEndDate', message: 'Срок изменился' }] },
    });
    await submit();
    expect(input('stages.0.plannedEndDate').disabled).toBe(false);
    await vi.waitFor(() => expect(input('stages.0.plannedEndDate')).toHaveFocus());
    expect(container.textContent).toContain('Срок изменился');
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('does not offer or send retries after an idempotency conflict', async () => {
    await objectStep();
    await stageDates();
    mocks.create.mockRejectedValueOnce({ status: 409, data: { code: 'idempotency_conflict' } });
    await submit();
    expect(container.textContent).toContain('Повтор не устранит конфликт.');
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(container.textContent).not.toContain('Повтор безопасен');
    expect(input('stages.0.plannedStartDate')).toBeDisabled();
    await submit();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it('rejects invalid manual dates instead of submitting a previously selected date', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    await renderForm();
    await objectStep();
    await stageDates();
    await fill('stages.0.plannedStartDate', '31.02.2026');
    await submit();
    expect(input('stages.0.plannedStartDate')).toHaveValue('31.02.2026');
    expect(input('stages.0.plannedStartDate')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  async function multipleStages() {
    const foundation = types[0] as ActiveStageType;
    await renderForm(
      [
        { ...foundation, code: 'roof', title: 'Крыша', position: 3 },
        foundation,
        { ...foundation, code: 'walls', title: 'Стены', position: 2 },
      ],
      'multiple',
    );
  }

  async function toggleStage(code: string) {
    const checkbox = container.querySelector<HTMLElement>(`#include-${code}`);
    if (!checkbox) throw new Error('Missing stage checkbox');
    await flush(() => checkbox.click());
  }

  it('requires at least one stage before opening the first editor', async () => {
    await objectStep(false);
    await toggleStage('foundation');
    await click('Заполнить этапы');
    expect(container.textContent).toContain('Включите хотя бы один этап.');
    await vi.waitFor(() => expect(container.querySelector('[role="checkbox"]')).toHaveFocus());
    expect(container.querySelector('[id="project-stages.0.plannedStartDate"]')).toBeNull();
    await toggleStage('foundation');
    expect(container.textContent).not.toContain('Включите хотя бы один этап.');
    await click('Заполнить этапы');
    expect(container.textContent).toContain('Этап 1 из 1.');
  });

  it('visits only selected stages in catalogue order and preserves fields on next and back', async () => {
    await multipleStages();
    await objectStep(false);
    await toggleStage('walls');
    await click('Заполнить этапы');
    expect(container.querySelector('h2')).toHaveTextContent('Фундамент');
    expect(container.textContent).toContain('Этап 1 из 2.');
    expect(container.querySelector('[id="project-stages.2.plannedStartDate"]')).toBeNull();
    await fill('stages.0.plannedWorkAmount', '123');
    await fill('stages.0.checklistItems.0.title', 'Своя проверка');
    expect(container.textContent).not.toContain('Пропустить этап');
    await click('Следующий этап');
    expect(container.querySelector('h2')).toHaveTextContent('Крыша');
    expect(container.textContent).toContain('Этап 2 из 2.');
    expect(container.textContent).not.toContain('Следующий этап');
    expect(container.textContent).not.toContain('Пропустить этап');
    await click('Назад');
    expect(input('stages.0.plannedWorkAmount')).toHaveValue('123');
    expect(input('stages.0.checklistItems.0.title')).toHaveValue('Своя проверка');
    await click('Следующий этап');
    mocks.create.mockResolvedValueOnce({ id: 77 });
    await click('Создать объект');
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      body: {
        stages: [
          { type: 'foundation', plannedWorkAmountMinor: 12300n, checklistItems: [{ title: 'Своя проверка' }] },
          { type: 'roof', plannedStartDate: null, plannedEndDate: null, plannedWorkAmountMinor: null },
        ],
      },
    });
  });

  it('validates next and returns to an invalid stage when creating from selection', async () => {
    await multipleStages();
    await objectStep();
    await fill('stages.0.plannedEndDate', '2027-01-01');
    await click('Следующий этап');
    expect(container.querySelector('h2')).toHaveTextContent('Фундамент');
    await vi.waitFor(() => expect(input('stages.0.plannedEndDate')).toHaveFocus());
    await click('Назад');
    await submit();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(container.querySelector('h2')).toHaveTextContent('Фундамент');
    await vi.waitFor(() => expect(input('stages.0.plannedEndDate')).toHaveFocus());
    await click('Назад');
    await toggleStage('foundation');
    mocks.create.mockResolvedValueOnce({ id: 77 });
    await submit();
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({ body: { stages: [{ type: 'walls' }, { type: 'roof' }] } });
  });

  it('opens the correct server-rejected stage across excluded stages', async () => {
    await multipleStages();
    await objectStep(false);
    await toggleStage('walls');
    mocks.create.mockRejectedValueOnce({
      status: 400,
      data: { details: [{ path: 'body.stages.1.plannedEndDate', message: 'Срок изменился' }] },
    });
    await submit();
    expect(container.querySelector('h2')).toHaveTextContent('Крыша');
    await vi.waitFor(() => expect(input('stages.2.plannedEndDate')).toHaveFocus());
    expect(input('stages.2.plannedEndDate')).not.toBeDisabled();
    expect(container.textContent).toContain('Срок изменился');
  });

  it('focuses the checklist error when creating from selection with no items', async () => {
    await multipleStages();
    await objectStep();
    const remove = container.querySelector<HTMLButtonElement>('button[aria-label="Удалить пункт 1"]');
    if (!remove) throw new Error('Missing checklist remove button');
    await flush(() => remove.click());
    await click('Назад');
    await submit();
    expect(container.querySelector('h2')).toHaveTextContent('Фундамент');
    expect(container.textContent).toContain('Добавьте хотя бы один пункт.');
    await vi.waitFor(() => expect(container.querySelector('fieldset[aria-invalid="true"]')).toHaveFocus());
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('validates required object fields before opening selection or configuration by click', async () => {
    await clickStep(2);
    expect(container.querySelector('h2')).toHaveTextContent('Объект');
    await vi.waitFor(() => expect(input('ownerName')).toHaveFocus());
    await clickStep(3);
    expect(container.querySelector('h2')).toHaveTextContent('Объект');
    expect(input('ownerName')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('switches between all three steps by click without losing object or stage fields', async () => {
    await multipleStages();
    await objectStep();
    await fill('stages.0.plannedWorkAmount', '123');
    await fill('stages.0.checklistItems.0.title', 'Своя проверка');
    await clickStep(1);
    expect(input('ownerName')).toHaveValue('Иван Иванов');
    await clickStep(2);
    expect(container.querySelector('h2')).toHaveTextContent('Выбор этапов');
    await toggleStage('walls');
    await clickStep(3);
    expect(container.querySelector('h2')).toHaveTextContent('Фундамент');
    expect(input('stages.0.plannedWorkAmount')).toHaveValue('123');
    expect(input('stages.0.checklistItems.0.title')).toHaveValue('Своя проверка');
    expect(container.querySelector('button[aria-label="3. Заполнение"]')).toHaveAttribute('aria-current', 'step');
    await click('Следующий этап');
    expect(container.querySelector('h2')).toHaveTextContent('Крыша');
    await clickStep(3);
    expect(container.querySelector('h2')).toHaveTextContent('Крыша');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('opens selection with an error when configuration is clicked with no selected stages', async () => {
    await objectStep(false);
    await toggleStage('foundation');
    await clickStep(1);
    await clickStep(3);
    expect(container.querySelector('h2')).toHaveTextContent('Выбор этапов');
    expect(container.textContent).toContain('Включите хотя бы один этап.');
    await vi.waitFor(() => expect(container.querySelector('[role="checkbox"]')).toHaveFocus());
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
