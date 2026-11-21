import { cleanupMediaCandidates } from './media-cleanup.ts';

Deno.test('cleanup retries storage failure without deleting metadata', async () => {
  const records = new Map([['media-1', 'room-1/media-1']]);
  const objects = new Set(['room-1/media-1']);
  const recordCount = () => records.size;
  const objectCount = () => objects.size;
  let failStorageOnce = true;
  const candidate = [{ id: 'media-1', storage_path: 'room-1/media-1' }];
  const removeObjectIfPresent = async (path: string) => {
    if (failStorageOnce) {
      failStorageOnce = false;
      throw new Error('temporary storage outage');
    }
    objects.delete(path);
  };
  const deleteMetadata = async (id: string) => {
    records.delete(id);
  };

  const first = await cleanupMediaCandidates(candidate, removeObjectIfPresent, deleteMetadata);
  if (first.failures.length !== 1 || recordCount() !== 1 || objectCount() !== 1) {
    throw new Error('Storage failure must preserve metadata and object for retry.');
  }

  const second = await cleanupMediaCandidates(candidate, removeObjectIfPresent, deleteMetadata);
  if (second.removed !== 1 || recordCount() !== 0 || objectCount() !== 0) {
    throw new Error('Retry must remove both the object and its metadata.');
  }
});

Deno.test('cleanup is idempotent when metadata deletion needs a retry', async () => {
  const records = new Set(['media-2']);
  const objects = new Set(['room-1/media-2']);
  const recordCount = () => records.size;
  const objectCount = () => objects.size;
  let failMetadataOnce = true;
  const candidate = [{ id: 'media-2', storage_path: 'room-1/media-2' }];
  const removeObjectIfPresent = async (path: string) => {
    objects.delete(path);
  };
  const deleteMetadata = async (id: string) => {
    if (failMetadataOnce) {
      failMetadataOnce = false;
      throw new Error('temporary database outage');
    }
    records.delete(id);
  };

  const first = await cleanupMediaCandidates(candidate, removeObjectIfPresent, deleteMetadata);
  if (first.failures[0]?.stage !== 'metadata' || objectCount() !== 0 || recordCount() !== 1) {
    throw new Error('Metadata failure must retain the candidate while allowing object deletion.');
  }

  const second = await cleanupMediaCandidates(candidate, removeObjectIfPresent, deleteMetadata);
  if (second.removed !== 1 || recordCount() !== 0 || objectCount() !== 0) {
    throw new Error('Retry must tolerate the already-absent object and delete metadata.');
  }
});
