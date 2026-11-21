export interface SyncStatus {
  state: 'not-configured' | 'configured-unverified';
  reason: string;
}
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { MediaExpiry } from '@/types';

let remoteClient: SupabaseClient | null = null;
let identityPromise: Promise<string> | null = null;

export function getRemoteClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!remoteClient) {
    remoteClient = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return remoteClient;
}

export async function ensureRemoteIdentity(): Promise<string | null> {
  const client = getRemoteClient();
  if (!client) return null;
  if (!identityPromise) {
    identityPromise = (async () => {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (sessionData.session?.user) return sessionData.session.user.id;

      const { data, error } = await client.auth.signInAnonymously();
      if (error) throw error;
      if (!data.user) throw new Error('Supabase did not return an authenticated user.');
      return data.user.id;
    })().catch((error: unknown) => {
      identityPromise = null;
      throw error;
    });
  }
  return identityPromise;
}

export async function createRemoteRoom(
  roomCode: string,
  inviteCode: string,
  expiresAt: string,
): Promise<string | null> {
  const client = getRemoteClient();
  if (!client) return null;
  await ensureRemoteIdentity();
  const { data, error } = await client.rpc('create_room', {
    room_code: roomCode,
    invite_code: inviteCode,
    invitation_expires_at: expiresAt,
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Supabase returned an invalid room identifier.');
  return data;
}

export async function joinRemoteRoom(inviteCode: string): Promise<string | null> {
  const client = getRemoteClient();
  if (!client) return null;
  await ensureRemoteIdentity();
  const { data, error } = await client.rpc('join_room', { invite_code: inviteCode });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Supabase returned an invalid room identifier.');
  return data;
}

export async function revokeRemoteRoom(roomId: string): Promise<boolean> {
  const client = getRemoteClient();
  if (!client || roomId.startsWith('room-')) return false;
  await ensureRemoteIdentity();
  const { error } = await client.rpc('revoke_room', { target_room: roomId });
  if (error) throw error;
  return true;
}

export async function uploadRemoteMedia(
  roomId: string,
  mediaId: string,
  blob: Blob,
  expiry: MediaExpiry,
  contentType: string,
): Promise<void> {
  const client = getRemoteClient();
  if (!client) throw new Error('Remote media is not configured.');
  await ensureRemoteIdentity();
  if (roomId.startsWith('room-')) throw new Error('This room is only available locally.');

  const { error } = await client.functions.invoke('media-upload', {
    body: blob,
    headers: {
      'x-media-id': mediaId,
      'x-room-id': roomId,
      'x-expiry-policy': expiry,
      'x-content-type': contentType,
      'content-type': 'application/octet-stream',
    },
  });
  if (error) throw error;
}

export async function downloadRemoteMedia(mediaId: string, claimToken: string): Promise<Blob> {
  const client = getRemoteClient();
  if (!client) throw new Error('Remote media is not configured.');
  await ensureRemoteIdentity();
  const { data, error } = await client.functions.invoke('media-view', {
    body: { action: 'download', mediaId, claimToken },
  });
  if (error) throw error;
  if (!(data instanceof Blob)) throw new Error('Media service returned an invalid response.');
  return data;
}

export async function completeRemoteMediaView(mediaId: string, claimToken: string): Promise<void> {
  await invokeRemoteMediaAction('complete', mediaId, claimToken);
}

export async function releaseRemoteMediaView(mediaId: string, claimToken: string): Promise<void> {
  await invokeRemoteMediaAction('release', mediaId, claimToken);
}

async function invokeRemoteMediaAction(
  action: 'complete' | 'release',
  mediaId: string,
  claimToken: string,
): Promise<void> {
  const client = getRemoteClient();
  if (!client) throw new Error('Remote media is not configured.');
  await ensureRemoteIdentity();
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { error } = await client.functions.invoke('media-view', {
      body: { action, mediaId, claimToken },
    });
    if (!error) return;
    lastError = error;
    if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 250 * 2 ** attempt));
  }
  throw lastError ?? new Error(`Could not ${action} the media reservation.`);
}

export async function registerRemotePushToken(
  roomId: string,
  token: string,
  platform = 'android',
): Promise<void> {
  const client = getRemoteClient();
  if (!client) throw new Error('Remote notifications are not configured.');
  await ensureRemoteIdentity();
  if (roomId.startsWith('room-')) throw new Error('This room is only available locally.');
  const { error } = await client.rpc('register_device_token', {
    target_room: roomId,
    push_token: token,
    platform_name: platform,
  });
  if (error) throw error;
}

export async function revokeRemotePushToken(roomId: string): Promise<void> {
  const client = getRemoteClient();
  if (!client || roomId.startsWith('room-')) return;
  await ensureRemoteIdentity();
  const { error } = await client.rpc('unregister_device_token', {
    target_room: roomId,
  });
  if (error) throw error;
}

export async function notifyRemotePartner(
  roomId: string,
  kind: 'invitation' | 'message' | 'game' | 'turn' | 'completion' | 'trophy' | 'presence',
): Promise<void> {
  const client = getRemoteClient();
  if (!client) return;
  await ensureRemoteIdentity();
  if (roomId.startsWith('room-')) return;
  const { error } = await client.functions.invoke('push-notification', {
    body: { roomId, kind },
  });
  if (error) throw error;
}

export async function saveRemoteNotificationPreferences(
  roomId: string,
  preferences: {
    messages: boolean;
    gameInvites: boolean;
    partnerActivity: boolean;
    trophies: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timeZone: string;
  },
): Promise<void> {
  const client = getRemoteClient();
  if (!client || roomId.startsWith('room-')) return;
  const userId = await ensureRemoteIdentity();
  if (!userId) throw new Error('Remote identity is unavailable.');
  const { error } = await client.from('notification_settings').upsert({
    user_id: userId,
    room_id: roomId,
    messages: preferences.messages,
    game_invites: preferences.gameInvites,
    partner_activity: preferences.partnerActivity,
    trophies: preferences.trophies,
    quiet_hours_start: preferences.quietHoursStart || null,
    quiet_hours_end: preferences.quietHoursEnd || null,
    time_zone: preferences.timeZone,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,room_id' });
  if (error) throw error;
}

export async function subscribeRemoteRoom(
  roomCode: string,
  onMessage: (payload: unknown) => void,
): Promise<(() => Promise<void>) | null> {
  const client = getRemoteClient();
  if (!client) return null;
  await ensureRemoteIdentity();
  const channel = client
    .channel(`room:${roomCode}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_code=eq.${roomCode}` },
      (payload) => onMessage(payload.new),
    )
    .subscribe();
  return async () => {
    await client.removeChannel(channel);
  };
}

/**
 * Internet play is designed for Supabase Realtime.
 * Transport encryption from Supabase is not end-to-end encryption.
 * Message bodies are sealed on-device with AES-GCM before they would be relayed.
 * This build does not claim a live relay until credentials exist and a connection test passes.
 */
export function getSyncStatus(): SyncStatus {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return {
      state: 'not-configured',
      reason:
        'Two-phone play needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The anon key is public by design. Never place the service-role key in the app. Apply the versioned Supabase migrations and enable anonymous sign-in.',
    };
  }
  return {
    state: 'configured-unverified',
    reason:
      'Supabase credentials are present. This session has not completed a live connection test, so Anywhere play stays unavailable until that test passes.',
  };
}

export function canPlayAnywhere(): boolean {
  return false;
}
