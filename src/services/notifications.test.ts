import { describe, expect, it } from 'vitest';
import {
  isInQuietHours,
  notificationEnabled,
  hasEnabledRemoteNotifications,
  scheduleLocalNotification,
} from './notifications';

const preferences = {
  messages: true,
  gameInvites: true,
  partnerActivity: true,
  trophies: true,
  sound: true,
  vibration: true,
};

describe('Notification preferences', () => {
  it('identifies when all server-delivered notification categories are disabled', () => {
    expect(hasEnabledRemoteNotifications(preferences)).toBe(true);
    expect(hasEnabledRemoteNotifications({
      ...preferences,
      messages: false,
      gameInvites: false,
      partnerActivity: false,
      trophies: false,
    })).toBe(false);
  });

  it('schedules a local notification without a remote push service', async () => {
    const scheduled: Array<{
      id: number;
      title: string;
      body: string;
      schedule: { at: Date };
    }> = [];
    await scheduleLocalNotification(async (notification) => {
      scheduled.push(notification);
    }, 'A private reminder', 'Open AFTERDARK.', 42);

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]).toMatchObject({
      id: 42,
      title: 'A private reminder',
      body: 'Open AFTERDARK.',
    });
    expect(scheduled[0].schedule.at).toBeInstanceOf(Date);
  });

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
