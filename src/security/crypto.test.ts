import { describe, it, expect, beforeEach } from 'vitest';
import {
  seal,
  openSeal,
  sealBytes,
  openSealBytes,
  exportRoomKey,
  importRoomKey,
  isSealed,
  rotateRoomKey,
} from './crypto';

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

  it('encrypts media bytes, rejects tampering, and uses a fresh nonce per payload', async () => {
    const media = new TextEncoder().encode('private media bytes');
    const sealed = await sealBytes(media);
    const opened = await openSealBytes(sealed);
    expect(new TextDecoder().decode(opened)).toBe('private media bytes');

    const altered = sealed.slice();
    altered[altered.length - 1] ^= 1;
    await expect(openSealBytes(altered)).rejects.toThrow();

    const payloads = await Promise.all(
      Array.from({ length: 128 }, () => sealBytes(new Uint8Array([1, 2, 3]))),
    );
    const nonces = payloads.map((payload) => Array.from(payload.slice(4, 16)).join(','));
    expect(new Set(nonces).size).toBe(payloads.length);
  });

  it('does not decrypt old media after local key rotation', async () => {
    const sealed = await sealBytes(new Uint8Array([7, 8, 9]));
    await rotateRoomKey();
    await expect(openSealBytes(sealed)).rejects.toThrow();
  });

  it('can restore the explicitly transferred room key after local storage is rotated', async () => {
    const sharedKey = await exportRoomKey();
    const sealed = await seal('paired device payload');
    await rotateRoomKey();
    await expect(openSeal(sealed)).rejects.toThrow();
    await importRoomKey(sharedKey);
    await expect(openSeal(sealed)).resolves.toBe('paired device payload');
  });
});
