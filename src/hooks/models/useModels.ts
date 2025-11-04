/**
 * React Query hooks for Whisper model management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import * as modelService from '../../services/models';
import type { DownloadProgress } from '../../services/models';
import { useDownloadStore } from '@/stores/downloadStore';

/**
 * Get list of available Whisper models
 */
export function useAvailableModels() {
  return useQuery({
    queryKey: ['models', 'available'],
    queryFn: async () => {
      const result = await modelService.getAvailableModels();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
}

/**
 * Check if a specific model is installed
 */
export function useModelInstalled(modelName: string) {
  return useQuery({
    queryKey: ['models', 'installed', modelName],
    queryFn: async () => {
      const result = await modelService.checkModelInstalled(modelName);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
}

/**
 * Check if the default model is installed
 */
export function useDefaultModelInstalled() {
  return useQuery({
    queryKey: ['models', 'default', 'installed'],
    queryFn: async () => {
      const result = await modelService.checkDefaultModelInstalled();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
}

/**
 * Get list of installed models
 */
export function useInstalledModels() {
  return useQuery({
    queryKey: ['models', 'installed'],
    queryFn: async () => {
      const result = await modelService.getInstalledModels();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
  });
}

/**
 * Download a Whisper model with progress tracking
 * Now integrated with global download store for persistent toast UI
 */
export function useDownloadModel() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [currentModelName, setCurrentModelName] = useState<string | null>(null);
  const { setModelProgress, clearDownload } = useDownloadStore();

  // Listen for progress events - update both local state and global store
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<DownloadProgress>('model-download-progress', (event) => {
      setProgress(event.payload);

      // Update global download store to show toast
      // Model name comes from the mutation state
      if (currentModelName) {
        setModelProgress({
          downloaded_bytes: event.payload.downloadedBytes,
          total_bytes: event.payload.totalBytes,
          percentage: event.payload.percentage,
        }, currentModelName);
      }
    }).then((unlistenFn) => {
      unlisten = unlistenFn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [setModelProgress, currentModelName]);

  const mutation = useMutation({
    mutationFn: async (modelName: string) => {
      // Store model name for progress tracking
      setCurrentModelName(modelName);

      const result = await modelService.downloadModel(modelName);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate queries to refresh installed status
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setProgress(null);
      setCurrentModelName(null);

      // Clear global download toast after a delay (handled by toast auto-hide)
      // Don't clear immediately to let user see completion
    },
    onError: () => {
      setProgress(null);
      setCurrentModelName(null);
      clearDownload();
    },
  });

  return {
    ...mutation,
    progress,
  };
}

/**
 * Delete a downloaded model
 */
export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelName: string) => {
      console.log('[useDeleteModel] Attempting to delete model:', modelName);
      const result = await modelService.deleteModel(modelName);
      console.log('[useDeleteModel] Result:', result);
      if (!result.success) {
        console.error('[useDeleteModel] Delete failed:', result.error);
        throw new Error(result.error);
      }
      console.log('[useDeleteModel] Delete successful');
    },
    onSuccess: () => {
      console.log('[useDeleteModel] onSuccess - invalidating queries');
      // Invalidate queries to refresh installed status
      queryClient.invalidateQueries({ queryKey: ['models'] });
      // Show success message
      alert('Model deleted successfully!');
    },
    onError: (error) => {
      console.error('[useDeleteModel] onError:', error);
      alert(`Failed to delete model: ${error.message}`);
    },
  });
}
