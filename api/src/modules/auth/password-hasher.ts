import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

const ARGON2_VERSION = 19;
const ARGON2_MEMORY_KIB = 19_456;
const ARGON2_PASSES = 2;
const ARGON2_PARALLELISM = 1;
const ARGON2_SALT_LENGTH = 16;
const ARGON2_TAG_LENGTH = 32;

const encodedHashPattern = /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

interface PasswordHashParts {
  version: number;
  memory: number;
  passes: number;
  parallelism: number;
  salt: Buffer;
  hash: Buffer;
}

function deriveKey(password: string, parts: Omit<PasswordHashParts, 'version' | 'hash'> & { tagLength: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    argon2(
      'argon2id',
      {
        message: password,
        nonce: parts.salt,
        memory: parts.memory,
        passes: parts.passes,
        parallelism: parts.parallelism,
        tagLength: parts.tagLength,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

function parseEncodedHash(encodedHash: string): PasswordHashParts | null {
  const match = encodedHashPattern.exec(encodedHash);

  if (!match) {
    return null;
  }

  const [, versionValue, memoryValue, passesValue, parallelismValue, saltValue, hashValue] = match;
  const version = Number(versionValue);
  const memory = Number(memoryValue);
  const passes = Number(passesValue);
  const parallelism = Number(parallelismValue);
  const salt = Buffer.from(saltValue ?? '', 'base64url');
  const hash = Buffer.from(hashValue ?? '', 'base64url');

  if (
    version !== ARGON2_VERSION ||
    !Number.isSafeInteger(memory) ||
    memory < 8 ||
    memory > 1_048_576 ||
    !Number.isSafeInteger(passes) ||
    passes < 1 ||
    passes > 10 ||
    !Number.isSafeInteger(parallelism) ||
    parallelism < 1 ||
    parallelism > 16 ||
    salt.length < 16 ||
    salt.length > 64 ||
    hash.length < 16 ||
    hash.length > 64
  ) {
    return null;
  }

  return { version, memory, passes, parallelism, salt, hash };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(ARGON2_SALT_LENGTH);
  const hash = await deriveKey(password, {
    salt,
    memory: ARGON2_MEMORY_KIB,
    passes: ARGON2_PASSES,
    parallelism: ARGON2_PARALLELISM,
    tagLength: ARGON2_TAG_LENGTH,
  });

  return `$argon2id$v=${ARGON2_VERSION}$m=${ARGON2_MEMORY_KIB},t=${ARGON2_PASSES},p=${ARGON2_PARALLELISM}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parts = parseEncodedHash(encodedHash);

  if (!parts) {
    return false;
  }

  try {
    const actualHash = await deriveKey(password, {
      salt: parts.salt,
      memory: parts.memory,
      passes: parts.passes,
      parallelism: parts.parallelism,
      tagLength: parts.hash.length,
    });

    return actualHash.length === parts.hash.length && timingSafeEqual(actualHash, parts.hash);
  } catch {
    return false;
  }
}

export function passwordNeedsRehash(encodedHash: string): boolean {
  const parts = parseEncodedHash(encodedHash);

  return (
    !parts ||
    parts.memory !== ARGON2_MEMORY_KIB ||
    parts.passes !== ARGON2_PASSES ||
    parts.parallelism !== ARGON2_PARALLELISM ||
    parts.salt.length !== ARGON2_SALT_LENGTH ||
    parts.hash.length !== ARGON2_TAG_LENGTH
  );
}
