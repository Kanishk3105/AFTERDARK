export interface MediaCleanupCandidate {
  id: string;
  storage_path: string;
}

export interface MediaCleanupFailure {
  id: string;
  stage: 'storage' | 'metadata';
  message: string;
}

export interface MediaCleanupResult {
  removed: number;
  scanned: number;
  failures: MediaCleanupFailure[];
}

export async function cleanupMediaCandidates(
  candidates: MediaCleanupCandidate[],
  removeObjectIfPresent: (path: string) => Promise<void>,
  deleteMetadata: (id: string) => Promise<void>,
): Promise<MediaCleanupResult> {
  const failures: MediaCleanupFailure[] = [];
  let removed = 0;

  for (const candidate of candidates) {
    try {
      await removeObjectIfPresent(candidate.storage_path);
    } catch (error) {
      failures.push({
        id: candidate.id,
        stage: 'storage',
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    try {
      await deleteMetadata(candidate.id);
      removed += 1;
    } catch (error) {
      failures.push({
        id: candidate.id,
        stage: 'metadata',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { removed, scanned: candidates.length, failures };
}
