export interface InvitePayload {
  v: 1;
  code: string;
  exp: number;
  key: JsonWebKey;
  host: string;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRoomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function createRoomId(): string {
  return crypto.randomUUID();
}

export function encodeInvite(payload: InvitePayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeInvite(token: string): InvitePayload {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(token.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as InvitePayload;
  if (parsed.v !== 1 || !parsed.code || !parsed.exp || !parsed.key) {
    throw new Error('This invitation is not valid.');
  }
  return parsed;
}

export function inviteStatus(payload: InvitePayload, now = Date.now()): 'valid' | 'expired' {
  return now > payload.exp ? 'expired' : 'valid';
}

export function inviteLink(
  token: string,
  native = false,
  origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
): string {
  if (native) return `afterdark://join#${token}`;
  const url = new URL('/join', origin);
  url.hash = token;
  return url.toString();
}

export function inviteTokenFromDeepLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'afterdark:' || url.hostname !== 'join') return null;
    return url.hash.slice(1) || null;
  } catch {
    return null;
  }
}
