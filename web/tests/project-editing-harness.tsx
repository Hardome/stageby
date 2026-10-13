// Тестовые зависимости регистрируются до импорта компонентов формы.
import './project-editing-mocks';

// cspell:ignore unstub
import { act } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { ProjectEditor } from '@features/projects/edit/ui/project-editor';

import type { ProjectEdit } from '@api/types';

import { editSnapshot } from './project-edit-fixture';
import { getProjectEditingMocks } from './project-editing-mock-state';

export async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}
export function input(name: string) {
  const field = [...document.querySelectorAll('input')].find((element) => element.id === `project-${name}`);
  if (!(field instanceof HTMLInputElement)) throw new Error(`Missing input ${name}`);

  return field;
}

export async function fill(name: string, value: string) {
  await flush(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input(name), value);
    input(name).dispatchEvent(new Event('input', { bubbles: true }));
  });
}
export async function click(label: string) {
  const button = [...document.querySelectorAll<HTMLElement>('button, [role="checkbox"]')].find(
    (element) => element.textContent === label || element.getAttribute('aria-label') === label,
  );
  if (!button) throw new Error(`Missing button ${label}`);
  await flush(() => button.click());
}

export function setupProjectEditing() {
  const mocks = getProjectEditingMocks();
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

  return {
    get container() {
      return container;
    },
    get root() {
      return root;
    },
    get client() {
      return client;
    },
    get snapshot() {
      return snapshot;
    },
    submit,
    render,
  };
}
