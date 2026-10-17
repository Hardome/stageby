import { type FileTransfer, uploadFile } from './upload-file';

const mocks = vi.hoisted(() => ({ create: vi.fn(), complete: vi.fn() }));
vi.mock('@api/clients/createFileUpload', () => ({
  createFileUpload: (options: unknown) => ({ unwrap: () => mocks.create(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/completeFileUpload', () => ({
  completeFileUpload: (options: unknown) => ({ unwrap: () => mocks.complete(options) as Promise<unknown> }),
}));

function jpegTransfer(isValid = true): FileTransfer {
  const bytes = new Uint8Array(isValid ? [255, 216, 255, 224] : [1, 2, 3]);
  const file = new File([bytes], 'invoice.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(bytes.buffer) });

  return { id: 'upload', key: 'completion-key', file, status: 'uploading' };
}

describe('shared invoice file transfer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });
  it('checks JPEG contents before sending bytes', async () => {
    await expect(uploadFile(jpegTransfer(false), vi.fn(), 'material_invoice', 'image/jpeg')).rejects.toThrow('JPEG');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('uploads JPEG as an invoice and reuses the same completion after a lost response', async () => {
    const item = jpegTransfer();
    const update = (values: Partial<FileTransfer>) => Object.assign(item, values);
    mocks.create.mockResolvedValue({
      fileId: 41,
      status: 'pending',
      method: 'PUT',
      uploadUrl: 'https://storage.example/invoice',
      headers: {},
      expiresAt: '2099-01-01T00:00:00Z',
    });
    mocks.complete.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({ id: 41 });
    const transfer = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', transfer);
    await expect(uploadFile(item, update, 'material_invoice', 'image/jpeg')).rejects.toThrow('Connection lost');
    await uploadFile(item, update, 'material_invoice', 'image/jpeg');
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const body = mocks.create.mock.calls[0]?.[0] as { body: { purpose: string; mimeType: string } };
    expect(body.body.purpose).toBe('material_invoice');
    expect(body.body.mimeType).toBe('image/jpeg');
    expect(mocks.complete.mock.calls[1]).toEqual(mocks.complete.mock.calls[0]);
    expect(item.fileId).toBe(41);
    expect(transfer).toHaveBeenCalledWith(
      'https://storage.example/invoice',
      expect.objectContaining({ credentials: 'omit' }),
    );
    await uploadFile(item, update, 'material_invoice', 'image/jpeg');
    expect(mocks.complete).toHaveBeenCalledTimes(2);
  });
});
