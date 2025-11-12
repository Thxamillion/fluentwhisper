/**
 * React Query hooks for dictionary operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDictionaries,
  updateDictionaryActive,
  updateDictionarySortOrder,
  reorderDictionaries,
  addDictionary,
  deleteDictionary,
} from '@/services/dictionaries';
import type { DictType } from '@/services/dictionaries/types';

/**
 * Hook to get dictionaries for a language
 */
export function useDictionaries(language: string, enabled = true) {
  return useQuery({
    queryKey: ['dictionaries', language],
    queryFn: async () => {
      const result = await getDictionaries(language);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get dictionaries');
      }
      return result.data!;
    },
    enabled,
    staleTime: 0, // Always refetch to get latest changes
    refetchOnMount: true,
  });
}

/**
 * Hook to update dictionary active status
 */
export function useUpdateDictionaryActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: number;
      isActive: boolean;
    }) => {
      const result = await updateDictionaryActive(id, isActive);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update dictionary');
      }
    },
    onSuccess: () => {
      // Invalidate all dictionary queries
      queryClient.invalidateQueries({ queryKey: ['dictionaries'] });
    },
  });
}

/**
 * Hook to reorder dictionaries
 */
export function useReorderDictionaries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dictionaryIds: number[]) => {
      const result = await reorderDictionaries(dictionaryIds);
      if (!result.success) {
        throw new Error(result.error || 'Failed to reorder dictionaries');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionaries'] });
    },
  });
}

/**
 * Hook to add a custom dictionary
 */
export function useAddDictionary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      language,
      name,
      urlTemplate,
      dictType,
    }: {
      language: string;
      name: string;
      urlTemplate: string;
      dictType: DictType;
    }) => {
      const result = await addDictionary(language, name, urlTemplate, dictType);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add dictionary');
      }
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionaries'] });
    },
  });
}

/**
 * Hook to delete a custom dictionary
 */
export function useDeleteDictionary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteDictionary(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete dictionary');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dictionaries'] });
    },
  });
}
