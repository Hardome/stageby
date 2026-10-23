// cspell:ignore unstub
import { photoError, preparePhoto } from './prepare-photo';

const conversion = vi.hoisted(() => ({ heicTo: vi.fn() }));
vi.mock('heic-to/csp', () => ({ heicTo: conversion.heicTo }));

describe('photo preparation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects empty files, wrong MIME and source files over 20 MB before conversion', async () => {
    expect(photoError(new File([], 'empty.jpg', { type: 'image/jpeg' }))).toBeDefined();
    expect(photoError(new File(['pdf'], 'photo.jpg', { type: 'application/pdf' }))).toBeDefined();
    const file = new File(['image'], 'photo.heic', { type: 'image/heic' });
    Object.defineProperty(file, 'size', { value: 20_000_001 });

    await expect(preparePhoto(file)).rejects.toThrow('20 МБ');

    expect(conversion.heicTo).not.toHaveBeenCalled();
  });

  it('accepts a source photo exactly at the decimal limit', () => {
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 20_000_000 });
    expect(photoError(file)).toBeUndefined();
  });

  it.each([20_000_000, 20_000_001])('checks the prepared photo size %s', async (sizeBytes) => {
    const file = new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 100;
        naturalHeight = 100;
        src = '';
        decode() {
          return Promise.resolve();
        }
      },
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const canvas = document.createElement('canvas');
    vi.spyOn(document, 'createElement').mockReturnValue(canvas);
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback, mime) => {
      const blob = new Blob(['prepared'], { type: mime });
      Object.defineProperty(blob, 'size', { value: sizeBytes });
      callback(blob);
    });
    let result = 'accepted';
    try {
      await preparePhoto(file);
    } catch (error) {
      result = (error as Error).message;
    }
    expect(result).toBe(
      sizeBytes === 20_000_000 ? 'accepted' : 'Подготовленное фото превышает 20 МБ. Выберите меньший снимок.',
    );
  });

  it.each([
    ['camera.heic', 'image/heic', 'image/jpeg', 'camera.jpg'],
    ['camera.jpg', 'image/jpeg', 'image/jpeg', 'camera.jpg'],
    ['transparent.png', 'image/png', 'image/png', 'transparent.png'],
  ])('resizes %s and preserves its output MIME and name', async (name, input, output, resultName) => {
    const file = new File(['image'], name, { type: input });
    const drawImage = vi.fn();
    conversion.heicTo.mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }));
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 4000;
        naturalHeight = 2000;
        src = '';
        decode() {
          return Promise.resolve();
        }
      },
    );
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const canvas = document.createElement('canvas');
    vi.spyOn(document, 'createElement').mockReturnValue(canvas);
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const encode = vi.spyOn(canvas, 'toBlob').mockImplementation((callback, mime) => {
      callback(new Blob(['prepared'], { type: mime }));
    });

    const prepared = await preparePhoto(file);

    expect(canvas.width).toBe(2560);
    expect(canvas.height).toBe(1280);
    expect(encode).toHaveBeenCalledWith(expect.any(Function), output, 0.85);
    expect(prepared.name).toBe(resultName);
    expect(prepared.type).toBe(output);
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });
});
