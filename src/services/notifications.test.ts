import { describe, expect, it } from 'vitest';
import { isInQuietHours, notificationEnabled } from './notifications';

const preferences = {
  messages: true,
  gameInvites: true,
  partnerActivity: true,
  trophies: true,
  sound: true,
  vibration: true,
};

describe('Notification preferences', () => {
  it('disables quiet-hour notifications', () => {
    expect(isInQuietHours(
      { ...preferences, quietHoursStart: '22:00', quietHoursEnd: '07:00' },
      new Date(2026, 0, 1, 23, 0),
    )).toBe(true);
  });

  it('allows notifications outside quiet hours', () => {
    expect(notificationEnabled(
      'message',
      preferences,
      new Date(2026, 0, 1, 12, 0),
    )).toBe(true);
  });

  it('respects per-category preferences', () => {
    expect(notificationEnabled(
      'trophy',
      { ...preferences, trophies: false },
      new Date(2026, 0, 1, 12, 0),
    )).toBe(false);
  });
});
