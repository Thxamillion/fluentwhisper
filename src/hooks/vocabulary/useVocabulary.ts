/**
 * React Query hooks for vocabulary operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordWord, getUserVocab, getVocabStats, getRecentVocab } from '@/services/vocabulary';
import type { LangCode } from '@/services/vocabulary/types';

/**
 * Hook to get user's vocabulary for a language
 */
export function useUserVocab(language: LangCode, enabled = true) {
  return useQuery({
    queryKey: ['userVocab', language],
    queryFn: async () => {
      const result = await getUserVocab(language);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get vocabulary');
      }
      return result.data!;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get vocabulary statistics
 */
export function useVocabStats(language: LangCode, enabled = true) {
  return useQuery({
    queryKey: ['vocabStats', language],
    queryFn: async () => {
      const result = await getVocabStats(language);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get stats');
      }
      return result.data!;
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get recently learned vocabulary with translations
 */
export function useRecentVocab(language: LangCode, days: number = 7, limit: number = 6, enabled = true) {
  return useQuery({
    queryKey: ['recentVocab', language, days, limit],
    queryFn: async () => {
      const result = await getRecentVocab(language, days, limit);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get recent vocabulary');
      }
      return result.data!;
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to record a word (mutation)
 * Returns whether the word was new
 */
export function useRecordWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lemma,
      language,
      formSpoken,
    }: {
      lemma: string;
      language: LangCode;
      formSpoken: string;
    }) => {
      const result = await recordWord(lemma, language, formSpoken);
      if (!result.success) {
        throw new Error(result.error || 'Failed to record word');
      }
      return result.data!; // boolean: is_new
    },
    onSuccess: (_, variables) => {
      // Invalidate vocabulary and stats queries to refetch
      queryClient.invalidateQueries({ queryKey: ['userVocab', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['vocabStats', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['recentVocab', variables.language] });
    },
  });
}
