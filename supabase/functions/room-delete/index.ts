import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processRoomDeletionJobs, type RoomDeletionJob } from '../_shared/room-deletion.ts';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const roomIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mediaBucket = 'afterdark-private-media';

async function removeRoomObjects(client: SupabaseClient, roomId: string): Promise<void> {
  const storage = client.storage.from(mediaBucket);

  async function removePrefix(prefix: string): Promise<void> {
    while (true) {
      const { data, error } = await storage.list(prefix, { limit: 100, offset: 0 });
      if (error) throw error;
      if (!data?.length) return;

      const files = data
        .filter((entry) => entry.id !== null)
        .map((entry) => `${prefix}/${entry.name}`);
      const folders = data.filter((entry) => entry.id === null);

      if (files.length > 0) {
        const { error: removeError } = await storage.remove(files);
        if (removeError) throw removeError;
      }
      for (const folder of folders) {
        await removePrefix(`${prefix}/${folder.name}`);
      }
      if (files.length === 0 && folders.length === 0) return;
    }
  }

  await removePrefix(roomId);
}

async function processJobs(
  client: SupabaseClient,
  limit: number,
): Promise<{ completed: number; failed: number }> {
  const { data, error } = await client.rpc('claim_room_deletion_jobs', { max_jobs: limit });
  if (error) throw error;
  const jobs = Array.isArray(data) ? data as RoomDeletionJob[] : [];

  return processRoomDeletionJobs(
    jobs,
    (roomId) => removeRoomObjects(client, roomId),
    async (jobId) => {
      const { error: completeError } = await client.rpc('complete_room_deletion', {
        target_job: jobId,
      });
      if (completeError) throw completeError;
    },
    async (jobId, message) => {
      const { error: failError } = await client.rpc('fail_room_deletion', {
        target_job: jobId,
        failure: message,
      });
      if (failError) throw failError;
      console.error('Room deletion job failed and will be retried', { jobId, message });
    },
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('authorization');
  if (!url || !anonKey || !serviceKey || !authorization) {
    return new Response('Room deletion service is not configured', { status: 503, headers: corsHeaders });
  }

  const serviceClient = createClient(url, serviceKey);
  if (authorization === `Bearer ${serviceKey}`) {
    try {
      const result = await processJobs(serviceClient, 25);
      return Response.json(result, { headers: corsHeaders });
    } catch (error) {
      console.error('Scheduled room deletion processing failed', error);
      return new Response('Room deletion jobs could not be processed', {
        status: 503,
        headers: corsHeaders,
      });
    }
  }

  const userClient = createClient(url, anonKey, { global: { headers: { authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  let body: { action?: string; roomId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid request body', { status: 400, headers: corsHeaders });
  }
  if (body.action !== 'request' || typeof body.roomId !== 'string' || !roomIdPattern.test(body.roomId)) {
    return new Response('Invalid room deletion request', { status: 400, headers: corsHeaders });
  }

  const { data: jobId, error: requestError } = await userClient.rpc('request_room_deletion', {
    target_room: body.roomId,
  });
  if (requestError || typeof jobId !== 'string') {
    console.error('Room deletion request was rejected', requestError?.message);
    return new Response('Room deletion request was rejected', { status: 403, headers: corsHeaders });
  }

  return Response.json({ requested: true, completed: false }, { status: 202, headers: corsHeaders });
});
