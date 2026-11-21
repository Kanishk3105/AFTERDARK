import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAppStore } from '@/stores/app.store';
import { registerRemotePushToken } from '@/services/sync';

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

let pushListenerReady: Promise<void> | null = null;
let latestPushToken: string | null = null;

export interface LocalNotificationRequest {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date };
}

export async function scheduleLocalNotification(
  schedule: (notification: LocalNotificationRequest) => Promise<void>,
  title: string,
  body: string,
  id = Date.now(),
): Promise<void> {
  await schedule({
    id,
    title,
    body,
    schedule: { at: new Date(Date.now() + 100) },
  });
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
    return {
      localReady: typeof window !== 'undefined'
        && 'Notification' in window
        && Notification.permission === 'granted',
      pushReady: false,
    };
  }

  let pushReady = false;
  const preferences = useAppStore.getState().preferences.notifications;
  const wantsPush = preferences.messages || preferences.gameInvites ||
    preferences.partnerActivity || preferences.trophies;
  if (wantsPush) {
    if (!pushListenerReady) {
      pushListenerReady = (async () => {
        await PushNotifications.addListener('registration', ({ value }) => {
          latestPushToken = value;
          const roomId = useAppStore.getState().roomId;
          if (roomId) {
            void registerRemotePushToken(roomId, value).catch((error: unknown) => {
              console.error('Push token registration failed', error);
            });
          }
        });
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Native push registration failed', error);
        });
      })().catch((error: unknown) => {
        pushListenerReady = null;
        throw error;
      });
    }
    await pushListenerReady;
    const pushPermission = await PushNotifications.checkPermissions();
    const permission = pushPermission.receive === 'granted'
      ? pushPermission
      : await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
      pushReady = true;
    }
  }
  const currentLocalPermission = await LocalNotifications.checkPermissions();
  const localPermission = currentLocalPermission.display === 'granted'
    ? currentLocalPermission
    : await LocalNotifications.requestPermissions();

  return {
    localReady: localPermission.display === 'granted',
    pushReady,
    token: latestPushToken || undefined,
  };
}

export async function registerStoredPushToken(): Promise<void> {
  const roomId = useAppStore.getState().roomId;
  if (!roomId || !latestPushToken) return;
  await registerRemotePushToken(roomId, latestPushToken);
}

export function hasEnabledRemoteNotifications(preferences: NotificationPreferenceSnapshot): boolean {
  return preferences.messages
    || preferences.gameInvites
    || preferences.partnerActivity
    || preferences.trophies;
}

export async function showLocalNotification(
  title: string,
  body: string,
  id = Date.now(),
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') new Notification(title, { body });
    return;
  }
  await scheduleLocalNotification(
    async (notification) => {
      await LocalNotifications.schedule({ notifications: [notification] });
    },
    title,
    body,
    id,
  );
}

function clockMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}
