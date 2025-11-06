/**
 * Hook for running cleanup operations
 */

import { useMutation } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { logger } from '@/services/logger'

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
      logger.debug(`Cleanup complete: deleted ${stats.deletedCount} sessions, ${stats.failedCount} failures`, 'useCleanup');
    },
    onError: (error) => {
      logger.error('Cleanup failed:', 'useCleanup', error);
    }
  });
}
