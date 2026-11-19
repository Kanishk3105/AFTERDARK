import { describe, expect, it } from 'vitest';
import { expiresAt, expiryMilliseconds, isExpired } from './mediaExpiry';

describe('Media expiry', () => {
  it('maps timer values to milliseconds', () => {
    expect(expiryMilliseconds('5s')).toBe(5_000);
    expect(expiryMilliseconds('10s')).toBe(10_000);
    expect(expiryMilliseconds('30s')).toBe(30_000);
    expect(expiryMilliseconds('keep')).toBeNull();
  });

  it('creates a future expiry for timed media', () => {
    expect(expiresAt('5s', 1_000)).toBe(new Date(6_000).toISOString());
  });

  it('does not expire keep or unopened view-once records', () => {
    expect(expiresAt('keep', 1_000)).toBeUndefined();
    expect(expiresAt('view-once', 1_000)).toBeUndefined();
  });

  it('marks elapsed media expired', () => {
    expect(isExpired(new Date(5_000).toISOString(), 5_000)).toBe(true);
  });
});
