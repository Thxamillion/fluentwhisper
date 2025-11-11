/**
 * useUpdater Hook - React Query wrapper for updater service
 *
 * Provides reactive state management for app updates.
 * Checks for updates on mount and every 24 hours.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  checkForUpdates,
  installUpdate,
  getCurrentVersion,
  type UpdateInfo,
} from '../services/updater';

const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Hook to check for available updates
 *
 * Automatically checks on mount and every 24 hours
 */
export function useUpdateCheck() {
  return useQuery({
    queryKey: ['update-check'],
    queryFn: async () => {
      const result = await checkForUpdates();
      if (!result.success) {
        throw new Error(result.error || 'Failed to check for updates');
      }
      return result.update;
    },
    refetchInterval: UPDATE_CHECK_INTERVAL,
    refetchOnWindowFocus: false,
    retry: false, // Don't retry failed update checks
    // Don't throw errors to UI - silently fail update checks
    throwOnError: false,
  });
}

/**
 * Hook to manually trigger update check
 */
export function useManualUpdateCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await checkForUpdates();
      if (!result.success) {
        throw new Error(result.error || 'Failed to check for updates');
      }
      return result.update;
    },
    onSuccess: (data) => {
      // Update the cached update check result
      queryClient.setQueryData(['update-check'], data);
    },
  });
}

/**
 * Hook to install an update
 */
export function useInstallUpdate() {
  return useMutation({
    mutationFn: async () => {
      const result = await installUpdate();
      if (!result.success) {
        throw new Error(result.error || 'Failed to install update');
      }
      return result;
    },
  });
}

/**
 * Hook to get current app version
 */
export function useAppVersion() {
  return useQuery({
    queryKey: ['app-version'],
    queryFn: getCurrentVersion,
    staleTime: Infinity, // Version never changes during runtime
  });
}
