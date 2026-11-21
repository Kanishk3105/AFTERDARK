import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildFcmPayload,
  isUnregisteredFcmResponse,
  notificationTitles,
  postFcmWithRetry,
  shouldSendPush,
  type NotificationKind,
} from '../_shared/push.ts';

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlText(value: string): string {
  return base64Url(new TextEncoder().encode(value));
}

async function fcmAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64UrlText(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const keyBytes = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  ));
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!tokenResponse.ok) throw new Error('FCM OAuth token request failed');
  const token = await tokenResponse.json();
  return token.access_token;
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const textResponse = (body: string, status: number) =>
  new Response(body, { status, headers: corsHeaders });
const jsonResponse = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: corsHeaders });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return textResponse('Method not allowed', 405);
  const authorization = request.headers.get('authorization');
  if (!authorization) return textResponse('Unauthorized', 401);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const accountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!url || !anonKey || !serviceKey || !accountJson) {
    return textResponse('Push service is not configured', 503);
  }

  const userClient = createClient(url, anonKey, { global: { headers: { authorization } } });
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData.user) return textResponse('Unauthorized', 401);

  let input: { roomId?: unknown; kind?: unknown };
  try {
    input = await request.json();
  } catch {
    return textResponse('Invalid notification request', 400);
  }
  const roomId = input?.roomId;
  const kind = input?.kind as NotificationKind;
  if (typeof roomId !== 'string' || typeof kind !== 'string' || !Object.hasOwn(notificationTitles, kind)) {
    return textResponse('Invalid notification request', 400);
  }

  const admin = createClient(url, serviceKey);
  const { data: member } = await admin.from('room_members')
    .select('room_id')
    .eq('room_id', roomId)
    .eq('device_id', userData.user.id)
    .is('revoked_at', null)
    .maybeSingle();
  if (!member) return textResponse('Not a room member', 403);

  const { data: recipients, error: memberError } = await admin.from('room_members')
    .select('device_id')
    .eq('room_id', roomId)
    .is('revoked_at', null)
    .neq('device_id', userData.user.id);
  if (memberError) return textResponse('Could not load notification recipients', 500);

  const recipientIds = (recipients ?? []).map((row) => row.device_id);
  if (!recipientIds.length) return jsonResponse({ sent: 0 });
  const { data: settings, error: settingsError } = await admin.from('notification_settings')
    .select('user_id, messages, game_invites, partner_activity, trophies, quiet_hours_start, quiet_hours_end, time_zone')
    .eq('room_id', roomId)
    .in('user_id', recipientIds);
  if (settingsError) {
    console.error('Notification preferences could not be loaded', settingsError.message);
    return textResponse('Could not load notification preferences', 500);
  }
  const settingByUser = new Map((settings ?? []).map((setting) => [setting.user_id, setting]));
  const enabled = recipientIds.filter((userId) =>
    shouldSendPush(kind, settingByUser.get(userId), new Date())
  );
  const { data: devices, error: deviceError } = await admin.from('device_tokens')
    .select('token, user_id')
    .eq('room_id', roomId)
    .in('user_id', enabled);
  if (deviceError) return textResponse('Could not load device registrations', 500);
  if (!devices?.length) return jsonResponse({ sent: 0 });

  const account = JSON.parse(accountJson);
  const accessToken = await fcmAccessToken(account);
  let sent = 0;
  let failed = 0;
  for (const device of devices) {
    let response: Response;
    try {
      const result = await postFcmWithRetry(() => fetch(
        `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(buildFcmPayload(device.token, kind, roomId)),
        },
      ));
      response = result.response;
      if (result.retries) console.warn('FCM delivery succeeded after retries', result.retries);
    } catch (error) {
      failed += 1;
      console.error('FCM delivery exhausted network retries', error);
      continue;
    }

    if (response.ok) {
      sent += 1;
    } else {
      failed += 1;
      const body = await response.clone().text();
      if (await isUnregisteredFcmResponse(response)) {
        const { error } = await admin.from('device_tokens').delete()
          .eq('room_id', roomId)
          .eq('user_id', device.user_id)
          .eq('token', device.token);
        if (error) console.error('Stale FCM token removal failed', error.message);
      }
      console.error('FCM delivery failed', response.status, body);
    }
  }

  return jsonResponse({ sent, failed, attempted: devices.length });
});
