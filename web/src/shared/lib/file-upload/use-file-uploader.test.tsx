import { act, useEffect } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import type { UploadItem } from './types';
import { useFileUploader } from './use-file-uploader';

async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

interface TestUpload extends UploadItem {
  key: string;
  session?: string;
  fileId?: number;
}

const upload = vi.fn<(item: TestUpload, update: (values: Partial<TestUpload>) => void) => Promise<void>>();
const onError = vi.fn();

interface ExampleProperties {
  onChange: (value: ReturnType<typeof useFileUploader<TestUpload>>) => void;
}

function Example({ onChange }: ExampleProperties) {
  const result = useFileUploader<TestUpload>({
    createItem: (file) => ({ id: crypto.randomUUID(), key: crypto.randomUUID(), file, status: 'uploading' }),
    validateFile: (file) => (file.size === 0 ? 'Пустой файл' : undefined),
    upload,
    onError,
    errorMessage: () => 'Ошибка передачи',
  });

  useEffect(() => onChange(result), [result, onChange]);

  return null;
}

describe('file uploader state', () => {
  let root: Root;
  let container: HTMLDivElement;
  let uploads: ReturnType<typeof useFileUploader<TestUpload>>;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    upload.mockReset();
    onError.mockReset();
    container = document.createElement('div');
    root = createRoot(container);
    await flush(() =>
      root.render(
        <Example
          onChange={(value) => {
            uploads = value;
          }}
        />,
      ),
    );
  });
  afterEach(async () => {
    await flush(() => root.unmount());
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it('uploads valid files independently and retains adapter data across a retry', async () => {
    upload
      .mockImplementationOnce((_item, update) => {
        update({ session: 'saved-session' });

        return Promise.reject(new Error('Lost response'));
      })
      .mockImplementationOnce((_item, update) => {
        update({ fileId: 42 });

        return Promise.resolve();
      });
    await flush(() =>
      uploads.select([new File(['first'], 'first.pdf'), new File(['second'], 'second.pdf'), new File([], 'empty.pdf')]),
    );
    expect(uploads.items.map((item) => item.status)).toEqual(['failed', 'uploaded']);
    expect(uploads.error).toContain('empty.pdf: Пустой файл');
    expect(onError).toHaveBeenCalledTimes(1);
    const failed = uploads.items[0];
    if (!failed) throw new Error('Missing failed upload');
    expect(failed).toMatchObject({ session: 'saved-session', error: 'Ошибка передачи' });
    upload.mockImplementationOnce((item, update) => {
      expect(item).toMatchObject({ session: 'saved-session', key: failed.key });
      update({ fileId: 41 });

      return Promise.resolve();
    });
    await act(async () => {
      await uploads.retry(failed);
    });
    expect(uploads.items[0]).toMatchObject({ status: 'uploaded', fileId: 41, error: undefined });
    await flush(() => uploads.remove(failed.id));
    expect(uploads.items.map((item) => item.fileId)).toEqual([42]);
  });

  it('blocks duplicate retries and removal while uploading, including stale callbacks', async () => {
    const pending = Promise.withResolvers<void>();
    upload.mockReturnValue(pending.promise);
    const staleSelect = uploads.select;
    await flush(() => staleSelect([new File(['first'], 'first.pdf')]));
    const item = uploads.items[0];
    if (!item) throw new Error('Missing upload');
    await flush(() => {
      void uploads.retry(item);
      uploads.remove(item.id);
      staleSelect([new File(['second'], 'second.pdf')]);
    });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(uploads.items).toHaveLength(2);
    await flush(() => pending.resolve());
    expect(uploads.items.every((entry) => entry.status === 'uploaded')).toBe(true);
    await act(async () => {
      await uploads.retry(item);
    });
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
