/**
 * React Query hooks for Whisper model management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import * as modelService from '../../services/models';
import type { DownloadProgress } from '../../services/models';

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
 */
export function useDownloadModel() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  // Listen for progress events
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<DownloadProgress>('model-download-progress', (event) => {
      setProgress(event.payload);
    }).then((unlistenFn) => {
      unlisten = unlistenFn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const mutation = useMutation({
    mutationFn: async (modelName: string) => {
      const result = await modelService.downloadModel(modelName);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate queries to refresh installed status
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setProgress(null);
    },
    onError: () => {
      setProgress(null);
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
