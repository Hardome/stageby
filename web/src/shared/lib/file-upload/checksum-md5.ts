import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export function checksumMd5(buffer: ArrayBuffer): string {
  return bytesToHex(md5(new Uint8Array(buffer)));
}
