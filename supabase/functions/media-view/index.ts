import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return new Response('Authentication is required', { status: 401, headers: corsHeaders });
  }

  let input: { action?: string; mediaId?: string; claimToken?: string };
  try {
    input = await request.json();
  } catch {
    return new Response('Invalid request body', { status: 400, headers: corsHeaders });
  }
  const action = input.action ?? 'download';
  const mediaId = input.mediaId;
  const claimToken = input.claimToken;
  if (!mediaId || !uuidPattern.test(mediaId)) {
    return new Response('A valid mediaId is required', { status: 400, headers: corsHeaders });
  }
  if (action !== 'download' && action !== 'complete' && action !== 'release') {
    return new Response('Unsupported media action', { status: 400, headers: corsHeaders });
  }
  if ((action === 'complete' || action === 'release' || action === 'download')
    && (!claimToken || !uuidPattern.test(claimToken))) {
    return new Response('A valid claimToken is required', { status: 400, headers: corsHeaders });
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

  if (action === 'complete' || action === 'release') {
    const rpc = action === 'complete' ? 'complete_media_view' : 'release_media_view';
    const { error } = await userClient.rpc(rpc, {
      target_media: mediaId,
      target_claim_token: claimToken,
    });
    if (error) {
      console.error(`Media view ${action} failed`, error.message);
      return new Response('Media reservation is unavailable', { status: 409, headers: corsHeaders });
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const { data: claimed, error: claimError } = await userClient.rpc('claim_media_view', {
    target_media: mediaId,
    target_claim_token: claimToken,
  });
  if (claimError || !Array.isArray(claimed) || !claimed[0]) {
    const message = claimError?.message ?? '';
    if (message.includes('media_claimed')) {
      return new Response('Media is already reserved', { status: 409, headers: corsHeaders });
    }
    if (message.includes('media_unavailable') || message.includes('media_expired_or_consumed')) {
      return new Response('Media unavailable or expired', { status: 410, headers: corsHeaders });
    }
    console.error('Media reservation failed', message || 'No media record returned');
    return new Response('Media retrieval failed', { status: 500, headers: corsHeaders });
  }
  const serviceClient = createClient(url, serviceKey);
  const { data: media, error: downloadError } = await serviceClient.storage
    .from('afterdark-private-media')
    .download(claimed[0].storage_path);
  if (downloadError || !media) {
    console.error('Authorized media download failed', downloadError?.message);
    if (claimed[0].expiry_policy !== 'keep') {
      const { error: releaseError } = await userClient.rpc('release_media_view', {
        target_media: mediaId,
        target_claim_token: claimed[0].authorized_claim_token,
      });
      if (releaseError) console.error('Media view lease release failed', releaseError.message);
    }
    return new Response('Media temporarily unavailable', { status: 503, headers: corsHeaders });
  }

  return new Response(media.stream(), {
    status: 200,
    headers: {
      ...corsHeaders,
      'content-type': 'application/octet-stream',
      'cache-control': 'no-store, private, max-age=0',
      'x-content-type-options': 'nosniff',
    },
  });
});
