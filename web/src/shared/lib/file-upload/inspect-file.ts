export async function inspectFile(file: File, mimeType: 'application/pdf' | 'image/jpeg', savedChecksum?: string) {
  const buffer = await file.arrayBuffer();
  validateContents(buffer, mimeType);
  return savedChecksum ?? createChecksum(buffer);
}

function validateContents(buffer: ArrayBuffer, mimeType: 'application/pdf' | 'image/jpeg') {
  if (mimeType === 'application/pdf') {
    const signature = new TextDecoder().decode(buffer.slice(0, 5));
    if (signature !== '%PDF-') throw new Error('Содержимое файла не является PDF.');
    return;
  }

  const bytes = new Uint8Array(buffer);
  const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!isJpeg) throw new Error('Содержимое файла не является JPEG.');
}

async function createChecksum(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
