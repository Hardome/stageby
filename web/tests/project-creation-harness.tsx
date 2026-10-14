// Тестовые зависимости регистрируются до импорта компонентов формы.
import './project-creation-mocks';

import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { CreateProjectForm } from '@features/projects/create/ui/create-project-form';

import type { ActiveStageType } from '@api/types';

import { testStageTypes } from './project-create-fixture';
import { getProjectCreationMocks } from './project-creation-mock-state';

export const types = testStageTypes.slice(0, 1);

export async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

export function setupProjectCreation() {
  const mocks = getProjectCreationMocks();
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
    const button = container.querySelectorAll<HTMLButtonElement>(':scope nav[aria-label="Шаги создания"] button')[
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
    sessionStorage.clear();
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

  return {
    get container() {
      return container;
    },
    get root() {
      return root;
    },
    get queryClient() {
      return queryClient;
    },
    input,
    fill,
    submit,
    click,
    clickStep,
    objectStep,
    stageDates,
    renderForm,
    multipleStages,
    toggleStage,
  };
}
