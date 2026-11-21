import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const expectedSecret = Deno.env.get('MEDIA_CLEANUP_SECRET');
  if (!expectedSecret || request.headers.get('x-cleanup-secret') !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return new Response('Cleanup service is not configured', { status: 503 });

  const client = createClient(url, serviceKey);
  const { data: expired, error: queryError } = await client.rpc('media_cleanup_candidates', {
    max_age: '1 hour',
  });
  if (queryError) {
    console.error('Expired media query failed', queryError.message);
    return new Response('Cleanup query failed', { status: 500 });
  }

  let removed = 0;
  let failed = 0;
  for (const record of expired ?? []) {
    const { error: storageError } = await client.storage
      .from('afterdark-private-media')
      .remove([record.storage_path]);
    if (storageError) {
      failed += 1;
      console.error('Media object removal will retry', record.id, storageError.message);
      continue;
    }
    const { error: rowError } = await client.from('media_records').delete().eq('id', record.id);
    if (rowError) {
      failed += 1;
      console.error('Media record removal will retry', record.id, rowError.message);
      continue;
    }
    removed += 1;
  }

  return Response.json({ removed, failed, scanned: expired?.length ?? 0 });
});
