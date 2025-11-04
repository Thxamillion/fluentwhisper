/**
 * Hook for running cleanup operations
 */

import { useMutation } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

interface CleanupStats {
  deletedCount: number;
  failedCount: number;
}

/**
 * Run cleanup to delete old sessions based on retention period
 */
export function useCleanup() {
  return useMutation({
    mutationFn: async (retentionDays: number): Promise<CleanupStats> => {
      return await invoke('run_cleanup', { retentionDays });
    },
    onSuccess: (stats) => {
      console.log(`[useCleanup] Cleanup complete: deleted ${stats.deletedCount} sessions, ${stats.failedCount} failures`);
    },
    onError: (error) => {
      console.error('[useCleanup] Cleanup failed:', error);
    }
  });
}
