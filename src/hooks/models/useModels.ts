/**
 * React Query hooks for Whisper model management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as modelService from '../../services/models';
import { useDownloadStore } from '@/stores/downloadStore';
import { toast } from '@/lib/toast';
import { logger } from '@/services/logger'

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
 * Progress display is handled by GlobalDownloadToast component
 */
export function useDownloadModel() {
  const queryClient = useQueryClient();
  const { clearDownload } = useDownloadStore();

  const mutation = useMutation({
    mutationFn: async (modelName: string) => {
      const result = await modelService.downloadModel(modelName);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate queries to refresh installed status
      queryClient.invalidateQueries({ queryKey: ['models'] });
      // Clear global download toast after a delay (handled by toast auto-hide)
    },
    onError: () => {
      clearDownload();
    },
  });

  return mutation;
}

/**
 * Delete a downloaded model
 */
export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modelName: string) => {
      logger.debug('[useDeleteModel] Attempting to delete model:', modelName);
      const result = await modelService.deleteModel(modelName);
      logger.debug('Result', 'useDeleteModel', result);
      if (!result.success) {
        logger.error('Delete failed:', 'useDeleteModel', result.error);
        throw new Error(result.error);
      }
      logger.debug('Delete successful', 'useDeleteModel');
    },
    onSuccess: () => {
      logger.debug('onSuccess - invalidating queries', 'useDeleteModel');
      // Invalidate queries to refresh installed status
      queryClient.invalidateQueries({ queryKey: ['models'] });
      // Show success message
      toast.success('Model deleted successfully!');
    },
    onError: (error) => {
      logger.error('onError:', 'useDeleteModel', error);
      toast.error(`Failed to delete model: ${error.message}`);
    },
  });
}
