import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import type { UploadItem } from '@shared/lib/file-upload';

import { Uploader } from './uploader';

async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

describe('uploader interactions', () => {
  let root: Root;
  let container: HTMLDivElement;
  const onSelect = vi.fn();
  const onReject = vi.fn();
  const onRetry = vi.fn();
  const onRemove = vi.fn();

  async function render(items: UploadItem[] = [], isDisabled = false, error = '') {
    await flush(() =>
      root.render(
        <Uploader
          id="files"
          label="Документы"
          description="PDF"
          items={items}
          error={error}
          disabled={isDisabled}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxSize={20}
          validateFile={(file) => (file.size === 0 ? 'Файл пустой.' : undefined)}
          onSelect={onSelect}
          onReject={onReject}
          onRetry={onRetry}
          onRemove={onRemove}
        />,
      ),
    );
  }
  function input() {
    const element = container.querySelector('input');
    if (!element) throw new Error('Missing file input');

    return element;
  }
  async function select(files: File[]) {
    await flush(() => {
      Object.defineProperty(input(), 'files', { value: files, configurable: true });
      input().dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await render();
  });
  afterEach(async () => {
    await flush(() => root.unmount());
    container.remove();
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it('accepts valid files in a mixed selection and reports type, size and custom errors', async () => {
    const pdf = new File(['%PDF-'], 'valid.pdf', { type: 'application/pdf' });
    await select([
      pdf,
      new File(['image'], 'image.jpg', { type: 'image/jpeg' }),
      new File(['x'.repeat(21)], 'large.pdf', { type: 'application/pdf' }),
      new File([], 'empty.pdf', { type: 'application/pdf' }),
    ]);
    expect(onSelect).toHaveBeenCalledWith([pdf]);
    expect(onReject.mock.calls[0]?.[0]).toContain('Недопустимый тип файла');
    expect(onReject.mock.calls[0]?.[0]).toContain('превышает допустимый размер');
    expect(onReject.mock.calls[0]?.[0]).toContain('empty.pdf: Файл пустой.');
    await select([pdf]);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('accepts dropped files and opens the picker once with keyboard or click', async () => {
    const zone = container.querySelector('[role="button"]');
    if (!zone) throw new Error('Missing dropzone');
    const pdf = new File(['%PDF-'], 'drop.pdf', { type: 'application/pdf' });
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', {
      value: {
        files: [pdf],
        types: ['Files'],
        items: [{ kind: 'file', type: pdf.type, getAsFile: () => pdf }],
      },
    });
    await flush(() => zone.dispatchEvent(drop));
    expect(onSelect).toHaveBeenCalledWith([pdf]);
    const click = vi.spyOn(input(), 'click').mockImplementation(() => {});
    await flush(() => zone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })));
    expect(click).toHaveBeenCalledTimes(1);
    await flush(() => zone.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('shows statuses, accessible errors, retry and removal and respects disabled', async () => {
    const items: UploadItem[] = ['uploading', 'failed', 'uploaded'].map((status, index) => ({
      id: String(index),
      file: new File(['pdf'], `${index}.pdf`),
      status: status as UploadItem['status'],
    }));
    await render(items, false, 'Ошибка выбора');
    expect(container.querySelector('[role="button"]')).toHaveAttribute(
      'aria-describedby',
      'files-description files-error',
    );
    expect(container.querySelector('[role="button"]')).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('label')).toHaveAttribute('for', 'files');
    const removalButtons = [...container.querySelectorAll<HTMLButtonElement>('button[aria-label]')];
    expect(removalButtons[0]).toBeDisabled();
    const retry = container.querySelector<HTMLButtonElement>('button:not([aria-label])');
    await flush(() => {
      retry?.click();
      removalButtons[1]?.click();
    });
    expect(onRetry).toHaveBeenCalledWith(items[1]);
    expect(onRemove).toHaveBeenCalledWith('1');
    await render(items, true);
    expect(input()).toBeDisabled();
    expect([...container.querySelectorAll('button')].every((button) => button.disabled)).toBe(true);
    await select([new File(['pdf'], 'disabled.pdf', { type: 'application/pdf' })]);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
