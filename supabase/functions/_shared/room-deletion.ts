export interface RoomDeletionJob {
  job_id: string;
  room_id: string;
}

export interface RoomDeletionResult {
  completed: number;
  failed: number;
}

export async function processRoomDeletionJobs(
  jobs: RoomDeletionJob[],
  removeRoomObjects: (roomId: string) => Promise<void>,
  completeJob: (jobId: string) => Promise<void>,
  failJob: (jobId: string, message: string) => Promise<void>,
): Promise<RoomDeletionResult> {
  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await removeRoomObjects(job.room_id);
      await completeJob(job.job_id);
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await failJob(job.job_id, message);
      failed += 1;
    }
  }

  return { completed, failed };
}
