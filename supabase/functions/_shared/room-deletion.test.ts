import { processRoomDeletionJobs } from './room-deletion.ts';

Deno.test('room deletion retains its job after storage failure and retries safely', async () => {
  const jobs = [{ job_id: 'job-1', room_id: 'room-1' }];
  const objects = new Set(['room-1/media-1']);
  let failStorageOnce = true;
  const completion = { count: 0 };
  const recordedFailures: string[] = [];

  const removeRoomObjects = async (roomId: string) => {
    if (failStorageOnce) {
      failStorageOnce = false;
      throw new Error('temporary storage outage');
    }
    for (const path of objects) {
      if (path.startsWith(`${roomId}/`)) objects.delete(path);
    }
  };
  const completeJob = async () => {
    completion.count += 1;
  };
  const completedCount = () => completion.count;
  const failJob = async (_jobId: string, message: string) => {
    recordedFailures.push(message);
  };

  const first = await processRoomDeletionJobs(jobs, removeRoomObjects, completeJob, failJob);
  if (first.failed !== 1 || first.completed !== 0 || completedCount() !== 0) {
    throw new Error('A storage failure must leave room metadata pending for retry.');
  }
  const second = await processRoomDeletionJobs(jobs, removeRoomObjects, completeJob, failJob);
  if (second.completed !== 1 || completedCount() !== 1 || objects.size !== 0) {
    throw new Error('A retry must remove room objects before completing deletion.');
  }
  if (recordedFailures.length !== 1 || !recordedFailures[0].includes('storage outage')) {
    throw new Error('Storage failure details must be recorded for operational retry.');
  }
});

Deno.test('room deletion never completes metadata when object removal fails', async () => {
  let completed = false;
  let failed = false;
  const result = await processRoomDeletionJobs(
    [{ job_id: 'job-2', room_id: 'room-2' }],
    async () => { throw new Error('storage unavailable'); },
    async () => { completed = true; },
    async () => { failed = true; },
  );
  if (result.failed !== 1 || completed || !failed) {
    throw new Error('Room metadata must remain until all storage objects are removed.');
  }
});
