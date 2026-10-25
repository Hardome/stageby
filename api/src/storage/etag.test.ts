import { describe, expect, it } from 'vitest';

import { md5FromETag } from '#app/storage/s3-file-storage';

describe('MD5 from server ETag', () => {
  it.each(['0123456789abcdef0123456789abcdef', '"0123456789ABCDEF0123456789ABCDEF"'])('normalizes %s', (etag) => {
    expect(md5FromETag(etag)).toBe('0123456789abcdef0123456789abcdef');
  });

  it.each([undefined, '', 'unknown', '""', '"abcd"', 'a'.repeat(64), `"${'a'.repeat(32)}-2"`, `"${'a'.repeat(32)}`])(
    'rejects missing or unsupported ETag %s',
    (etag) => {
      expect(md5FromETag(etag)).toBeNull();
    },
  );
});
