import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function removeStorageObjectIfPresent(
  client: SupabaseClient,
  bucket: string,
  storagePath: string,
): Promise<void> {
  const separator = storagePath.lastIndexOf('/');
  if (separator <= 0 || separator === storagePath.length - 1) {
    throw new Error('Invalid storage object path');
  }
  const folder = storagePath.slice(0, separator);
  const filename = storagePath.slice(separator + 1);
  const storage = client.storage.from(bucket);
  const { data: objects, error: listError } = await storage.list(folder, {
    limit: 1,
    search: filename,
  });
  if (listError) throw listError;
  if (!objects?.some((object) => object.name === filename)) return;

  const { error: removeError } = await storage.remove([storagePath]);
  if (removeError) throw removeError;
}
