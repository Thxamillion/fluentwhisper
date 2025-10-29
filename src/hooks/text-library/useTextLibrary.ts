/**
 * React Query hooks for text library
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as textLibraryService from '@/services/text-library';
import type {
  TextLibraryItem,
  CreateTextLibraryItemInput,
  UpdateTextLibraryItemInput,
} from '@/services/text-library';

/**
 * Hook to get all text library items
 */
export function useTextLibrary() {
  return useQuery({
    queryKey: ['textLibrary', 'all'],
    queryFn: textLibraryService.getAllTextLibraryItems,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get a single text library item by ID
 */
export function useTextLibraryItem(id: string) {
  return useQuery({
    queryKey: ['textLibrary', 'detail', id],
    queryFn: () => textLibraryService.getTextLibraryItem(id),
    staleTime: 60000, // 1 minute
    enabled: !!id,
  });
}

/**
 * Hook to get text library items by language
 */
export function useTextLibraryByLanguage(language: string) {
  return useQuery({
    queryKey: ['textLibrary', 'byLanguage', language],
    queryFn: () => textLibraryService.getTextLibraryByLanguage(language),
    staleTime: 30000, // 30 seconds
    enabled: !!language,
  });
}

/**
 * Hook to create a new text library item
 */
export function useCreateTextLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTextLibraryItemInput) =>
      textLibraryService.createTextLibraryItem(input),
    onSuccess: () => {
      // Invalidate all text library queries to refetch
      queryClient.invalidateQueries({ queryKey: ['textLibrary'] });
    },
  });
}

/**
 * Hook to update a text library item
 */
export function useUpdateTextLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTextLibraryItemInput }) =>
      textLibraryService.updateTextLibraryItem(id, updates),
    onSuccess: (updatedItem) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['textLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['textLibrary', 'detail', updatedItem.id] });
    },
  });
}

/**
 * Hook to delete a text library item
 */
export function useDeleteTextLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => textLibraryService.deleteTextLibraryItem(id),
    onSuccess: () => {
      // Invalidate all text library queries
      queryClient.invalidateQueries({ queryKey: ['textLibrary'] });
    },
  });
}
