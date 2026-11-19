const KEY_STORAGE = 'afterdark-room-key-jwk';
const memoryStore: Record<string, string> = {};

function storageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return memoryStore[key] || null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {}
  memoryStore[key] = value;
}

function storageRemove(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch {}
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
  const existing = storageGet(KEY_STORAGE);
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
  storageSet(KEY_STORAGE, JSON.stringify(jwk));
  return key;
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
  storageSet(KEY_STORAGE, JSON.stringify(stored));
}

export async function rotateRoomKey(): Promise<void> {
  storageRemove(KEY_STORAGE);
  await getRoomKey();
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

export function isSealed(value: string | undefined): boolean {
  return !!value && value.startsWith('v1.');
}
