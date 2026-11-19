import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export type NotificationKind =
  | 'invitation'
  | 'message'
  | 'game'
  | 'turn'
  | 'completion'
  | 'trophy'
  | 'presence';

export interface NotificationPreferenceSnapshot {
  messages: boolean;
  gameInvites: boolean;
  partnerActivity: boolean;
  trophies: boolean;
  sound: boolean;
  vibration: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export function notificationEnabled(
  kind: NotificationKind,
  preferences: NotificationPreferenceSnapshot,
  now = new Date(),
): boolean {
  let kindEnabled = true;
  if (kind === 'message') kindEnabled = preferences.messages;
  if (kind === 'invitation' || kind === 'game' || kind === 'turn') kindEnabled = preferences.gameInvites;
  if (kind === 'presence') kindEnabled = preferences.partnerActivity;
  if (kind === 'trophy') kindEnabled = preferences.trophies;
  if (!kindEnabled) return false;
  return !isInQuietHours(preferences, now);
}

export function isInQuietHours(
  preferences: NotificationPreferenceSnapshot,
  now = new Date(),
): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = clockMinutes(preferences.quietHoursStart);
  const end = clockMinutes(preferences.quietHoursEnd);
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export async function initializeNotifications(): Promise<{
  localReady: boolean;
  pushReady: boolean;
  token?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { localReady: 'Notification' in window, pushReady: false };
  }

  let pushReady = false;
  let token: string | undefined;
  const pushPermission = await PushNotifications.requestPermissions();
  if (pushPermission.receive === 'granted') {
    await PushNotifications.register();
    pushReady = true;
  }
  const localPermission = await LocalNotifications.requestPermissions();
  if (localPermission.display === 'granted') {
    await PushNotifications.addListener('registration', (result) => {
      token = result.value;
    });
  }

  return {
    localReady: localPermission.display === 'granted',
    pushReady,
    token,
  };
}

export async function showLocalNotification(
  title: string,
  body: string,
  id = Date.now(),
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.schedule({
    notifications: [{ id, title, body, schedule: { at: new Date(Date.now() + 100) } }],
  });
}

function clockMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}
