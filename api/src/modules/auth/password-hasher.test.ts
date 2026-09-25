import { describe, expect, it } from 'vitest';

import { hashPassword, passwordNeedsRehash, verifyPassword } from './password-hasher.ts';

describe('Хеширование паролей', () => {
  it('создаёт самодостаточный Argon2id-хеш и проверяет пароль', async () => {
    const password = 'Надёжный пароль 123!';
    const encodedHash = await hashPassword(password);

    expect(encodedHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(encodedHash).not.toContain(password);
    expect(passwordNeedsRehash(encodedHash)).toBe(false);
    await expect(verifyPassword(password, encodedHash)).resolves.toBe(true);
    await expect(verifyPassword('другой пароль', encodedHash)).resolves.toBe(false);
  });

  it('использует новую соль для каждого хеша', async () => {
    const [firstHash, secondHash] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);

    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword('same-password', firstHash)).resolves.toBe(true);
    await expect(verifyPassword('same-password', secondHash)).resolves.toBe(true);
  });

  it('безопасно отклоняет повреждённые и устаревшие хеши', async () => {
    await expect(verifyPassword('password', 'not-an-argon2-hash')).resolves.toBe(false);
    expect(passwordNeedsRehash('not-an-argon2-hash')).toBe(true);

    const currentHash = await hashPassword('password');
    expect(passwordNeedsRehash(currentHash.replace('m=19456', 'm=19457'))).toBe(true);
  });
});
