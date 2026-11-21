export type NotificationKind =
  | 'invitation'
  | 'message'
  | 'game'
  | 'turn'
  | 'completion'
  | 'trophy'
  | 'presence';

export interface PushPreference {
  messages: boolean;
  game_invites: boolean;
  partner_activity: boolean;
  trophies: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  time_zone: string;
}

export const notificationTitles: Record<NotificationKind, string> = {
  invitation: 'AFTERDARK invitation',
  message: 'A new private message',
  game: 'A game invitation',
  turn: 'It is your turn',
  completion: 'Game completed',
  trophy: 'A trophy was unlocked',
  presence: 'Your partner entered the room',
};

export function shouldSendPush(
  kind: NotificationKind,
  preference: PushPreference | undefined,
  now = new Date(),
): boolean {
  if (!preference) return kind !== 'presence';
  const enabled = kind === 'message'
    ? preference.messages
    : kind === 'invitation' || kind === 'game' || kind === 'turn'
      ? preference.game_invites
      : kind === 'presence'
        ? preference.partner_activity
        : kind === 'trophy'
          ? preference.trophies
          : true;
  return enabled && !isInQuietHours(preference, now);
}

export function isInQuietHours(
  preference: Pick<PushPreference, 'quiet_hours_start' | 'quiet_hours_end' | 'time_zone'>,
  now: Date,
): boolean {
  const { quiet_hours_start: start, quiet_hours_end: end } = preference;
  if (!start || !end) return false;
  const startMinute = parseClock(start);
  const endMinute = parseClock(end);
  if (startMinute === null || endMinute === null) return true;
  if (startMinute === endMinute) return false;

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: preference.time_zone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return true;
    const currentMinute = hour * 60 + minute;
    return startMinute < endMinute
      ? currentMinute >= startMinute && currentMinute < endMinute
      : currentMinute >= startMinute || currentMinute < endMinute;
  } catch {
    return true;
  }
}

function parseClock(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function buildFcmPayload(
  token: string,
  kind: NotificationKind,
  roomId: string,
): { message: Record<string, unknown> } {
  return {
    message: {
      token,
      notification: { title: notificationTitles[kind], body: 'Open AFTERDARK to view.' },
      data: { kind, roomId },
      android: { priority: 'high' },
    },
  };
}

export interface FcmPostResult {
  response: Response;
  retries: number;
}

export async function postFcmWithRetry(
  post: () => Promise<Response>,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  maxRetries = 2,
): Promise<FcmPostResult> {
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await post();
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      await wait(250 * 2 ** attempt);
      continue;
    }
    if (response.ok || !isTransientStatus(response.status) || attempt >= maxRetries) {
      return { response, retries: attempt };
    }
    await response.clone().text();
    await wait(250 * 2 ** attempt);
  }
}

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function isUnregisteredFcmResponse(response: Response): Promise<boolean> {
  try {
    const failure = await response.clone().json();
    return failure?.error?.details?.some(
      (detail: { errorCode?: string }) => detail.errorCode === 'UNREGISTERED',
    ) ?? false;
  } catch {
    return false;
  }
}
