import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { cleanupMediaCandidates } from '../_shared/media-cleanup.ts';
import { removeStorageObjectIfPresent } from '../_shared/media-storage.ts';

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

  const result = await cleanupMediaCandidates(
    expired ?? [],
    (path) => removeStorageObjectIfPresent(client, 'afterdark-private-media', path),
    async (id) => {
      const { error } = await client.from('media_records').delete().eq('id', id);
      if (error) throw error;
    },
  );
  for (const failure of result.failures) {
    console.error(`Media ${failure.stage} removal will retry`, failure.id, failure.message);
  }

  return Response.json({
    removed: result.removed,
    failed: result.failures.length,
    scanned: result.scanned,
  });
});
