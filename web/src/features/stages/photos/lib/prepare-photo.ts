const maxPhotoSize = 20 * 1024 * 1024;
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

export function photoError(file: File): string | undefined {
  if (!/\.(jpe?g|png|heic|heif)$/i.test(file.name) || (file.type && !acceptedTypes.has(file.type)))
    return 'Выберите JPEG, PNG или HEIC.';
  if (file.size === 0) return 'Файл пустой.';
  if (file.size > maxPhotoSize) return 'Размер исходного фото не должен превышать 20 МиБ.';
}

async function decodePhoto(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function preparePhoto(file: File): Promise<File> {
  const invalid = photoError(file);
  if (invalid) throw new Error(invalid);

  let source: Blob = file;
  const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);

  if (/\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/.test(file.type)) {
    const { heicTo } = await import('heic-to/csp');
    source = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.85 });
  }

  const image = await decodePhoto(source);
  const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Не удалось подготовить фото. Выберите другой снимок.');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const mime = isPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Не удалось обработать изображение.'));
      },
      mime,
      0.85,
    );
  });
  if (blob.size > maxPhotoSize) throw new Error('Подготовленное фото превышает 20 МиБ. Выберите меньший снимок.');

  return new File([blob], `${file.name.replace(/\.[^.]+$/, '').slice(0, 240)}.${isPng ? 'png' : 'jpg'}`, {
    type: mime,
  });
}
