export interface SyncStatus {
  state: 'not-configured' | 'configured-unverified';
  reason: string;
}
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

let remoteClient: SupabaseClient | null = null;
let remoteChannel: RealtimeChannel | null = null;

export function getRemoteClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!remoteClient) {
    remoteClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return remoteClient;
}

export async function subscribeRemoteRoom(
  roomCode: string,
  onMessage: (payload: unknown) => void,
): Promise<(() => Promise<void>) | null> {
  const client = getRemoteClient();
  if (!client) return null;
  remoteChannel = client
    .channel(`room:${roomCode}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_code=eq.${roomCode}` },
      (payload) => onMessage(payload.new),
    )
    .subscribe();
  return async () => {
    if (remoteChannel) {
      await client.removeChannel(remoteChannel);
      remoteChannel = null;
    }
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
        'Two-phone play needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. The anon key is public by design. Never place the service-role key in the app. Apply supabase/schema.sql, then enable anonymous sign-in.',
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
