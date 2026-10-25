// cspell:ignore unstub
/* eslint-disable sonarjs/hashing -- MD5 проверяется только для контроля передачи файлов. */
import { createHash } from 'node:crypto';

import type { PhotoUpload } from '../model/types';
import { uploadPhoto } from './upload-photo';

const mocks = vi.hoisted(() => ({ create: vi.fn(), complete: vi.fn(), attach: vi.fn(), prepare: vi.fn() }));
vi.mock('@api/clients/createFileUpload', () => ({
  createFileUpload: (...arguments_: unknown[]) => ({ unwrap: () => mocks.create(...arguments_) as Promise<unknown> }),
}));
vi.mock('@api/clients/completeFileUpload', () => ({
  completeFileUpload: (...arguments_: unknown[]) => ({
    unwrap: () => mocks.complete(...arguments_) as Promise<unknown>,
  }),
}));
vi.mock('@api/clients/createChecklistItemPhoto', () => ({
  createChecklistItemPhoto: (...arguments_: unknown[]) => ({
    unwrap: () => mocks.attach(...arguments_) as Promise<unknown>,
  }),
}));
vi.mock('./prepare-photo', () => ({
  preparePhoto: (...arguments_: unknown[]) => mocks.prepare(...arguments_) as Promise<File>,
}));

function makeUpload(): PhotoUpload {
  const file = new File(['source'], 'camera.heic', { type: 'image/heic' });

  return { id: crypto.randomUUID(), file, completionKey: crypto.randomUUID(), status: 'waiting' };
}

describe('photo upload checkpoints', () => {
  const signal = new AbortController().signal;
  let put: ReturnType<typeof vi.fn>;
  let item: PhotoUpload;

  function save(next: PhotoUpload) {
    item = next;

    return Promise.resolve();
  }

  beforeEach(() => {
    vi.resetAllMocks();
    put = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', put);
    const prepared = new File(['jpeg'], 'camera.jpg', { type: 'image/jpeg' });
    Object.defineProperty(prepared, 'arrayBuffer', {
      value: () => Promise.resolve(new TextEncoder().encode('jpeg').buffer),
    });
    mocks.prepare.mockResolvedValue(prepared);
    mocks.create.mockResolvedValue({
      fileId: 41,
      status: 'pending',
      method: 'PUT',
      uploadUrl: 'https://storage.example/upload',
      headers: { 'Content-Type': 'image/jpeg', 'content-md5': 'checksum-base64' },
      expiresAt: '2099-01-01T00:00:00Z',
    });
    mocks.complete.mockResolvedValue({ id: 41 });
    mocks.attach.mockResolvedValue({ id: 10, fileId: 41 });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(['prepare', 'create', 'put', 'complete', 'attach'])(
    'resumes after failure at %s without duplicate files',
    async (step) => {
      item = makeUpload();
      const failing = step === 'put' ? put : mocks[step as keyof typeof mocks];
      failing.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(uploadPhoto(item, 7, signal, save)).rejects.toThrow('Connection lost');
      await uploadPhoto(item, 7, signal, save);

      expect(item).toMatchObject({ attached: true, fileId: 41, status: 'uploaded' });
      expect(mocks.create).toHaveBeenCalledTimes(
        step === 'prepare' || step === 'create' ? 2 - Number(step === 'prepare') : 1,
      );
      expect(put).toHaveBeenCalledTimes(step === 'put' ? 2 : 1);
      const expectedBody: unknown = expect.objectContaining({
        originalName: 'camera.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
        checksumMd5: item.checksum,
      });
      expect(mocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ body: expectedBody }));
      expect(item.checksum).toBe(createHash('md5').update('jpeg').digest('hex'));
      expect(put).toHaveBeenLastCalledWith(
        'https://storage.example/upload',
        expect.objectContaining({ headers: { 'Content-Type': 'image/jpeg', 'content-md5': 'checksum-base64' } }),
      );

      await uploadPhoto(item, 7, signal, save);

      expect(mocks.attach).toHaveBeenCalledTimes(step === 'attach' ? 2 : 1);
    },
  );

  it('replaces only a confirmed expired session and rotates its completion key', async () => {
    item = makeUpload();
    mocks.complete.mockRejectedValueOnce(new Error('Connection lost'));

    await expect(uploadPhoto(item, 7, signal, save)).rejects.toThrow();
    const previousKey = item.completionKey;
    if (item.session) item.session.expiresAt = '2000-01-01T00:00:00Z';
    mocks.complete.mockRejectedValueOnce({ status: 409, data: { code: 'upload_expired' } });

    await uploadPhoto(item, 7, signal, save);

    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(item.completionKey).not.toBe(previousKey);
    expect(item.attached).toBe(true);
  });

  it('keeps uploaded file and attachment identity after a concurrent photo limit rejection', async () => {
    item = makeUpload();
    mocks.attach.mockRejectedValueOnce({ status: 409, data: { code: 'photo_limit_exceeded' } });

    await expect(uploadPhoto(item, 7, signal, save)).rejects.toMatchObject({ status: 409 });
    await uploadPhoto(item, 7, signal, save);

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(mocks.attach.mock.calls[0]).toEqual(mocks.attach.mock.calls[1]);
  });

  it('pauses before attachment when the session is aborted', async () => {
    const controller = new AbortController();
    const item = makeUpload();
    controller.abort();

    await expect(uploadPhoto(item, 7, controller.signal, vi.fn())).rejects.toThrow();

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.attach).not.toHaveBeenCalled();
  });
});
