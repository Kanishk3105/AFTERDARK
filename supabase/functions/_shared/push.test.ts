import {
  buildFcmPayload,
  isInQuietHours,
  isUnregisteredFcmResponse,
  notificationTitles,
  postFcmWithRetry,
  shouldSendPush,
  type PushPreference,
} from './push.ts';

const enabledPreference: PushPreference = {
  messages: true,
  game_invites: true,
  partner_activity: true,
  trophies: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  time_zone: 'UTC',
};

Deno.test('notification categories respect opt-outs and absent presence settings', () => {
  if (shouldSendPush('message', { ...enabledPreference, messages: false })) {
    throw new Error('Disabled messages must not dispatch.');
  }
  if (shouldSendPush('presence', undefined)) {
    throw new Error('Presence must be disabled until explicitly opted in.');
  }
  if (!shouldSendPush('trophy', enabledPreference)) {
    throw new Error('Enabled trophy notifications should dispatch.');
  }
});

Deno.test('quiet hours support overnight ranges and fail closed on invalid time zones', () => {
  const night = new Date('2026-01-01T23:30:00Z');
  if (!isInQuietHours({
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:00:00',
    time_zone: 'UTC',
  }, night)) {
    throw new Error('Overnight quiet hours should include late-night times.');
  }
  if (!isInQuietHours({
    quiet_hours_start: '22:00',
    quiet_hours_end: '07:00',
    time_zone: 'Not/A_Timezone',
  }, night)) {
    throw new Error('Invalid time zones must suppress notifications.');
  }
});

Deno.test('FCM payloads use generic private copy for every notification kind', () => {
  for (const kind of Object.keys(notificationTitles) as Array<keyof typeof notificationTitles>) {
    const payload = buildFcmPayload('device-token', kind, 'room-id');
    const message = payload.message as {
      notification: { title: string; body: string };
      data: { kind: string; roomId: string };
    };
    if (message.notification.body !== 'Open AFTERDARK to view.'
      || message.data.kind !== kind
      || message.data.roomId !== 'room-id') {
      throw new Error(`Notification payload for ${kind} exposed or omitted required metadata.`);
    }
  }
});

Deno.test('FCM retries transient failures and does not retry permanent client errors', async () => {
  let transientCalls = 0;
  const delays: number[] = [];
  const transient = await postFcmWithRetry(
    async () => {
      transientCalls += 1;
      return transientCalls === 1 ? new Response('busy', { status: 503 }) : new Response(null, { status: 200 });
    },
    async (milliseconds) => { delays.push(milliseconds); },
  );
  if (transientCalls !== 2 || transient.retries !== 1 || delays[0] !== 250 || !transient.response.ok) {
    throw new Error('Transient FCM errors should be retried with bounded backoff.');
  }

  let permanentCalls = 0;
  const permanent = await postFcmWithRetry(async () => {
    permanentCalls += 1;
    return new Response('bad request', { status: 400 });
  }, async () => {});
  if (permanentCalls !== 1 || permanent.response.status !== 400) {
    throw new Error('Permanent FCM errors must not be retried.');
  }
});

Deno.test('unregistered FCM tokens are distinguishable from ordinary failures', async () => {
  const stale = new Response(JSON.stringify({
    error: {
      details: [{ errorCode: 'UNREGISTERED' }],
    },
  }), { status: 404, headers: { 'content-type': 'application/json' } });
  const transient = new Response(JSON.stringify({
    error: { message: 'Unavailable' },
  }), { status: 503, headers: { 'content-type': 'application/json' } });
  if (!await isUnregisteredFcmResponse(stale) || await isUnregisteredFcmResponse(transient)) {
    throw new Error('Only explicit UNREGISTERED errors should trigger token removal.');
  }
});
