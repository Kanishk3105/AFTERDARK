import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authorization = request.headers.get('authorization');
  const mediaId = (await request.json().catch(() => null))?.mediaId;
  if (!authorization || typeof mediaId !== 'string') {
    return new Response('Authentication and mediaId are required', { status: 400, headers: corsHeaders });
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

  const { data: claimed, error: claimError } = await userClient.rpc('claim_media_view', {
    target_media: mediaId,
  });
  if (claimError || !Array.isArray(claimed) || !claimed[0]) {
    return new Response('Media unavailable or expired', { status: 410, headers: corsHeaders });
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

  if (claimed[0].expiry_policy !== 'keep') {
    const { error: completeError } = await userClient.rpc('complete_media_view', {
      target_media: mediaId,
      target_claim_token: claimed[0].authorized_claim_token,
    });
    if (completeError) {
      const { error: releaseError } = await userClient.rpc('release_media_view', {
        target_media: mediaId,
        target_claim_token: claimed[0].authorized_claim_token,
      });
      if (releaseError) console.error('Media view lease release failed', releaseError.message);
      console.error('View-once completion failed', completeError.message);
      return new Response('Media temporarily unavailable', { status: 503, headers: corsHeaders });
    }
    if (claimed[0].expiry_policy === 'view-once') {
      const { error: removeError } = await serviceClient.storage
        .from('afterdark-private-media')
        .remove([claimed[0].storage_path]);
      if (removeError) console.error('View-once object cleanup will retry', removeError.message);
      else {
        const { error: rowError } = await serviceClient.from('media_records').delete().eq('id', mediaId);
        if (rowError) console.error('View-once metadata cleanup will retry', rowError.message);
      }
    }
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
