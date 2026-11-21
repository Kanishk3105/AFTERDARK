export interface InvitePayload {
  v: 2;
  code: string;
  roomCode: string;
  exp: number;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITATION_CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createRoomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function createInvitationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function createRoomId(): string {
  return crypto.randomUUID();
}

export function encodeInvite(payload: InvitePayload): string {
  if (
    payload.v !== 2
    || !INVITATION_CODE_PATTERN.test(payload.code)
    || !/^[A-Z2-9]{6,12}$/.test(payload.roomCode)
    || !Number.isSafeInteger(payload.exp)
  ) {
    throw new Error('This invitation is not valid.');
  }
  const json = JSON.stringify({
    v: payload.v,
    code: payload.code,
    roomCode: payload.roomCode,
    exp: payload.exp,
  });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeInvite(token: string): InvitePayload {
  if (!token || token.length > 4096) {
    throw new Error('This invitation is not valid.');
  }
  const padded = token.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(token.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('This invitation is not valid.');
  }
  const fields = Object.keys(parsed);
  if (fields.some((field) => !['v', 'code', 'roomCode', 'exp'].includes(field))) {
    throw new Error('This invitation is not valid.');
  }
  const payload = parsed as InvitePayload;
  if (
    payload.v !== 2
    || typeof payload.code !== 'string'
    || !INVITATION_CODE_PATTERN.test(payload.code)
    || typeof payload.roomCode !== 'string'
    || !/^[A-Z2-9]{6,12}$/.test(payload.roomCode)
    || !Number.isSafeInteger(payload.exp)
  ) {
    throw new Error('This invitation is not valid.');
  }
  return payload;
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
