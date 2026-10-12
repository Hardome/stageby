import type { DocumentUpload } from '../model/types';
import { documentError, maxDocumentSize, uploadDocument } from './upload-document';

const mocks = vi.hoisted(() => ({ create: vi.fn(), complete: vi.fn() }));
vi.mock('@api/clients/createFileUpload', () => ({
  createFileUpload: (...arguments_: unknown[]) => ({ unwrap: () => mocks.create(...arguments_) as Promise<unknown> }),
}));
vi.mock('@api/clients/completeFileUpload', () => ({
  completeFileUpload: (...arguments_: unknown[]) => ({
    unwrap: () => mocks.complete(...arguments_) as Promise<unknown>,
  }),
}));

describe('project PDF upload', () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.complete.mockReset();
  });
  afterEach(() => {
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it('rejects wrong MIME, empty files and sizes exceeding the limit', () => {
    expect(documentError(new File(['image'], 'image.jpg', { type: 'image/jpeg' }))).toBeDefined();
    expect(documentError(new File([], 'drawing.pdf', { type: 'application/pdf' }))).toBeDefined();
    const file = new File(['%PDF-1.7'], 'drawing.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: maxDocumentSize, configurable: true });
    expect(documentError(file)).toBeUndefined();
    Object.defineProperty(file, 'size', { value: maxDocumentSize + 1 });
    expect(documentError(file)).toBeDefined();
  });
  it.each([false, true])('reuses the session after a lost completion response (expired: %s)', async (expired) => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const buffer = new TextEncoder().encode('%PDF-1.7\n').buffer;
    const file = new File(['%PDF-1.7\n'], 'drawing.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(buffer) });
    const document: DocumentUpload = { id: 'document', key: 'completion-key-123456', file, status: 'uploading' };
    const update = (values: Partial<DocumentUpload>) => Object.assign(document, values);
    mocks.create.mockResolvedValue({
      fileId: 41,
      method: 'PUT',
      uploadUrl: 'https://storage.example/upload',
      headers: { 'Content-Type': 'application/pdf' },
      expiresAt: '2099-01-01T00:00:00Z',
    });
    mocks.complete.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ id: 41 });
    await expect(uploadDocument(document, update)).rejects.toThrow('Connection lost');
    if (expired && document.session) document.session.expiresAt = '2000-01-01T00:00:00Z';
    await uploadDocument(document, update);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.complete.mock.calls[0]?.[0]).toEqual(mocks.complete.mock.calls[1]?.[0]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://storage.example/upload',
      expect.objectContaining({ credentials: 'omit' }),
    );
    expect(document).toMatchObject({ status: 'uploaded', fileId: 41 });
    expect(fetchMock).toHaveBeenCalledTimes(expired ? 1 : 2);
  });
  it('rejects a PDF with invalid contents before creating an upload session', async () => {
    const file = new File(['invalid'], 'drawing.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new TextEncoder().encode('invalid').buffer),
    });
    await expect(
      uploadDocument({ id: 'file', key: 'completion-key', file, status: 'uploading' }, vi.fn()),
    ).rejects.toThrow('Содержимое файла не является PDF.');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([
    new Error('Connection lost'),
    { status: 401, data: { code: 'unauthorized' } },
    { status: 409, data: { code: 'idempotency_conflict' } },
    { status: 500, data: { code: 'upload_expired' } },
  ])('retains an expired session when completion is not confirmed: %j', async (error) => {
    const file = new File(['%PDF-1.7'], 'drawing.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new TextEncoder().encode('%PDF-1.7').buffer),
    });
    const document: DocumentUpload = {
      id: 'file',
      key: 'completion-key',
      file,
      status: 'failed',
      checksum: 'a'.repeat(64),
      session: {
        fileId: 40,
        status: 'pending',
        method: 'PUT',
        uploadUrl: 'https://storage.example/expired',
        headers: {},
        expiresAt: '2000-01-01T00:00:00Z',
      },
    };
    const original = { ...document };
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mocks.complete.mockRejectedValueOnce(error);
    await expect(uploadDocument(document, (values) => Object.assign(document, values))).rejects.toBe(error);
    expect(document).toEqual(original);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('replaces a confirmed expired session with a new completion key and the same checksum', async () => {
    const file = new File(['%PDF-1.7'], 'drawing.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(new TextEncoder().encode('%PDF-1.7').buffer),
    });
    const document: DocumentUpload = {
      id: 'file',
      key: 'completion-key',
      file,
      status: 'failed',
      checksum: 'a'.repeat(64),
      session: {
        fileId: 40,
        status: 'pending',
        method: 'PUT',
        uploadUrl: 'https://storage.example/expired',
        headers: {},
        expiresAt: '2000-01-01T00:00:00Z',
      },
    };
    mocks.create.mockResolvedValue({
      ...document.session,
      fileId: 41,
      uploadUrl: 'https://storage.example/new',
      expiresAt: '2099-01-01T00:00:00Z',
    });
    mocks.complete
      .mockRejectedValueOnce({ status: 409, data: { code: 'upload_expired' } })
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValueOnce({ id: 41 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const update = (values: Partial<DocumentUpload>) => Object.assign(document, values);
    await expect(uploadDocument(document, update)).rejects.toThrow('Connection lost');
    expect(document.key).not.toBe('completion-key');
    await uploadDocument(document, update);
    const request = mocks.create.mock.calls[0]?.[0] as { body: { checksumSha256: string } };
    expect(request.body.checksumSha256).toBe(document.checksum);
    expect(mocks.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { uploadId: 41 },
        headers: { 'Idempotency-Key': document.key },
      }),
    );
    expect(document).toMatchObject({ fileId: 41, status: 'uploaded' });
    expect(mocks.complete.mock.calls[0]?.[0]).toMatchObject({
      path: { uploadId: 40 },
      headers: { 'Idempotency-Key': 'completion-key' },
    });
    expect(mocks.complete.mock.calls[1]?.[0]).toEqual(mocks.complete.mock.calls[2]?.[0]);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
