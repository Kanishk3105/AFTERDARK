import { describe, it, expect, beforeEach } from 'vitest';
import { seal, openSeal, isSealed, rotateRoomKey } from './crypto';

describe('AES-GCM Cryptographic Sealing', () => {
  beforeEach(async () => {
    await rotateRoomKey();
  });

  it('correctly seals and opens plaintext payloads', async () => {
    const secret = 'Tonight in the velvet room at midnight';
    const sealed = await seal(secret);

    expect(typeof sealed).toBe('string');
    expect(isSealed(sealed)).toBe(true);
    expect(sealed).not.toContain(secret);

    const decrypted = await openSeal(sealed);
    expect(decrypted).toBe(secret);
  });

  it('detects invalid or corrupted sealed payloads', async () => {
    await expect(openSeal('invalid.payload')).rejects.toThrow();
  });
});
