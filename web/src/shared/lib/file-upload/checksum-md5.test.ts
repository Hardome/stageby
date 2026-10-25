/* eslint-disable sonarjs/hashing -- MD5 проверяется только для контроля передачи файлов. */
import { createHash } from 'node:crypto';

import { checksumMd5 } from './checksum-md5';
import { inspectFile } from './inspect-file';

describe('file MD5 checksum', () => {
  it.each([
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['a', '0cc175b9c0f1b6a831c399e269772661'],
    ['168', '006f52e9102a8d3be2fe5614f42ba989'],
  ])('matches the known vector for %j', (source, expected) => {
    const buffer = new TextEncoder().encode(source).buffer;

    expect(checksumMd5(buffer)).toBe(expected);
    expect(checksumMd5(buffer)).toBe(createHash('md5').update(new Uint8Array(buffer)).digest('hex'));
  });

  it('matches Node for binary data and Base64 of digest bytes', () => {
    const buffer = new Uint8Array([0, 255, 128, 1, 0, 34, 13, 10]).buffer;
    const hex = checksumMd5(buffer);

    expect(hex).toBe(createHash('md5').update(new Uint8Array(buffer)).digest('hex'));
    expect(Buffer.from(hex, 'hex').toString('base64')).toBe(
      createHash('md5').update(new Uint8Array(buffer)).digest('base64'),
    );
  });

  it('calculates PDF MD5 and reuses its saved checksum after validating contents', async () => {
    const buffer = new TextEncoder().encode('%PDF-1.7').buffer;
    const file = new File([buffer], 'drawing.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(buffer) });

    expect(await inspectFile(file, 'application/pdf')).toBe(checksumMd5(buffer));
    expect(await inspectFile(file, 'application/pdf', '0'.repeat(32))).toBe('0'.repeat(32));
  });
});
