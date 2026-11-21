import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-media-id, x-room-id, x-expiry-policy, x-content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const maxEncryptedMediaBytes = 50 * 1024 * 1024;
const mediaMagic = [0x41, 0x44, 0x31, 0x00];

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authorization = request.headers.get('authorization');
  const mediaId = request.headers.get('x-media-id');
  const roomId = request.headers.get('x-room-id');
  const expiry = request.headers.get('x-expiry-policy');
  const contentType = request.headers.get('x-content-type');
  if (!authorization || !mediaId || !roomId || !expiry || !contentType) {
    return new Response('Required upload metadata is missing', { status: 400, headers: corsHeaders });
  }
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      return new Response('Invalid media length', { status: 400, headers: corsHeaders });
    }
    if (length > maxEncryptedMediaBytes) {
      return new Response('Media exceeds the 50 MiB limit', { status: 413, headers: corsHeaders });
    }
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return new Response('Media service is not configured', { status: 503, headers: corsHeaders });
  }

  const userClient = createClient(url, anonKey, { global: { headers: { authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const encryptedMedia = await request.arrayBuffer();
  const bytes = new Uint8Array(encryptedMedia);
  if (bytes.length > maxEncryptedMediaBytes) {
    return new Response('Media exceeds the 50 MiB limit', { status: 413, headers: corsHeaders });
  }
  if (bytes.length < 32) {
    return new Response('Encrypted media is incomplete', { status: 400, headers: corsHeaders });
  }
  if (!mediaMagic.every((byte, index) => bytes[index] === byte)) {
    return new Response('Media must use the AFTERDARK encrypted container', { status: 400, headers: corsHeaders });
  }

  const { data: path, error: recordError } = await userClient.rpc('create_media_record', {
    target_media: mediaId,
    target_room: roomId,
    target_expiry_policy: expiry,
    target_content_type: contentType,
  });
  if (recordError || typeof path !== 'string') {
    return new Response('Media metadata was rejected', { status: 403, headers: corsHeaders });
  }

  const serviceClient = createClient(url, serviceKey);
  const { error: uploadError } = await serviceClient.storage
    .from('afterdark-private-media')
    .upload(path, new Blob([encryptedMedia], { type: 'application/octet-stream' }), {
      contentType: 'application/octet-stream',
      upsert: true,
    });
  if (uploadError) {
    console.error('Encrypted media upload failed', uploadError.message);
    return new Response('Media upload failed', { status: 503, headers: corsHeaders });
  }

  return Response.json({ uploaded: true }, { headers: corsHeaders });
});
