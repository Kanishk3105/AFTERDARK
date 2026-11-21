import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const KEY_STORAGE = 'afterdark-room-key-jwk';
const memoryStore: Record<string, string> = {};
let securePrefixPromise: Promise<void> | null = null;
let roomKeyPromise: Promise<CryptoKey> | null = null;

async function storageGet(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    securePrefixPromise ??= SecureStorage.setKeyPrefix('afterdark');
    await securePrefixPromise;
    const secured = await SecureStorage.getItem(key);
    if (secured) return secured;
    const legacy = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (legacy) {
      await SecureStorage.setItem(key, legacy);
      window.localStorage.removeItem(key);
    }
    return legacy;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (error) {
    console.error('Browser key storage is unavailable', error);
    throw error;
  }
  return memoryStore[key] || null;
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    securePrefixPromise ??= SecureStorage.setKeyPrefix('afterdark');
    await securePrefixPromise;
    await SecureStorage.setItem(key, value);
    return;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (error) {
    console.error('Browser key storage is unavailable', error);
    throw error;
  }
  memoryStore[key] = value;
}

async function storageRemove(key: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    securePrefixPromise ??= SecureStorage.setKeyPrefix('afterdark');
    await securePrefixPromise;
    await SecureStorage.removeItem(key);
    return;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch (error) {
    console.error('Browser key storage is unavailable', error);
    throw error;
  }
  delete memoryStore[key];
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function getRoomKey(): Promise<CryptoKey> {
  if (!roomKeyPromise) {
    roomKeyPromise = (async () => {
      const existing = await storageGet(KEY_STORAGE);
      if (existing) {
        return crypto.subtle.importKey(
          'jwk',
          JSON.parse(existing) as JsonWebKey,
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt'],
        );
      }
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
        'encrypt',
        'decrypt',
      ]);
      const jwk = await crypto.subtle.exportKey('jwk', key);
      await storageSet(KEY_STORAGE, JSON.stringify(jwk));
      return key;
    })().catch((error: unknown) => {
      roomKeyPromise = null;
      throw error;
    });
  }
  return roomKeyPromise;
}

export async function exportRoomKey(): Promise<JsonWebKey> {
  const key = await getRoomKey();
  return crypto.subtle.exportKey('jwk', key);
}

export async function importRoomKey(jwk: JsonWebKey): Promise<void> {
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ]);
  const stored = await crypto.subtle.exportKey('jwk', key);
  await storageSet(KEY_STORAGE, JSON.stringify(stored));
  roomKeyPromise = Promise.resolve(key);
}

export async function rotateRoomKey(): Promise<void> {
  roomKeyPromise = null;
  await storageRemove(KEY_STORAGE);
  await getRoomKey();
}

export async function clearRoomKey(): Promise<void> {
  roomKeyPromise = null;
  await storageRemove(KEY_STORAGE);
}

/** AES-GCM seal. Format: v1.<iv>.<ciphertext>, both segments base64. */
export async function seal(plain: string): Promise<string> {
  const key = await getRoomKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plain);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return `v1.${bytesToB64(iv)}.${bytesToB64(new Uint8Array(cipher))}`;
}

export async function openSeal(payload: string): Promise<string> {
  const [version, ivPart, dataPart] = payload.split('.');
  if (version !== 'v1' || !ivPart || !dataPart) {
    throw new Error('Unrecognized sealed payload');
  }
  const key = await getRoomKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(ivPart) },
    key,
    b64ToBytes(dataPart),
  );
  return new TextDecoder().decode(plain);
}

export async function sealBytes(plain: Uint8Array): Promise<Uint8Array> {
  const key = await getRoomKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  const result = new Uint8Array(4 + iv.length + cipher.byteLength);
  result.set([0x41, 0x44, 0x31, 0x00]);
  result.set(iv, 4);
  result.set(new Uint8Array(cipher), 16);
  return result;
}

export async function openSealBytes(payload: Uint8Array): Promise<Uint8Array> {
  if (payload.length < 32 || payload[0] !== 0x41 || payload[1] !== 0x44 ||
    payload[2] !== 0x31 || payload[3] !== 0x00) {
    throw new Error('Unrecognized sealed media payload');
  }
  const key = await getRoomKey();
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.subarray(4, 16) },
    key,
    payload.subarray(16),
  );
  return new Uint8Array(plain);
}

export function isSealed(value: string | undefined): boolean {
  return !!value && value.startsWith('v1.');
}
