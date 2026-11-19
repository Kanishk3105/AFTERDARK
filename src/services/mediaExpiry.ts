import type { MediaExpiry } from '@/types';

export function expiryMilliseconds(expiry: MediaExpiry): number | null {
  switch (expiry) {
    case 'view-once':
      return null;
    case '5s':
      return 5_000;
    case '10s':
      return 10_000;
    case '30s':
      return 30_000;
    case 'keep':
      return null;
  }
}

export function expiresAt(expiry: MediaExpiry, now = Date.now(), viewed = false): string | undefined {
  if (expiry === 'keep') return undefined;
  if (expiry === 'view-once') return viewed ? new Date(now).toISOString() : undefined;
  const milliseconds = expiryMilliseconds(expiry);
  return milliseconds === null ? undefined : new Date(now + milliseconds).toISOString();
}

export function isExpired(expiresAtValue: string | undefined, now = Date.now(), viewed = false): boolean {
  if (!expiresAtValue) return false;
  if (viewed) return now >= Date.parse(expiresAtValue);
  return now >= Date.parse(expiresAtValue);
}
