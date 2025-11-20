/**
 * React Query hooks for vocabulary operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordWord, getUserVocab, getVocabStats, getRecentVocab, deleteVocabWord, toggleVocabMastered, addVocabTag, removeVocabTag, getVocabByTag } from '@/services/vocabulary';
import type { LangCode } from '@/services/vocabulary/types';
import { toast } from '@/lib/toast';

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
export function useRecentVocab(
  language: LangCode,
  primaryLanguage: LangCode,
  days: number = 7,
  limit: number = 6,
  enabled = true
) {
  return useQuery({
    queryKey: ['recentVocab', language, primaryLanguage, days, limit],
    queryFn: async () => {
      const result = await getRecentVocab(language, primaryLanguage, days, limit);
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

/**
 * Hook to delete a word from vocabulary
 */
export function useDeleteVocabWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lemma,
      language,
    }: {
      lemma: string;
      language: LangCode;
    }) => {
      const result = await deleteVocabWord(lemma, language);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete word');
      }
      return lemma;
    },
    onSuccess: (lemma, variables) => {
      // Show success toast
      toast.success(`"${lemma}" removed from vocabulary`);

      // Invalidate vocabulary and stats queries to refetch
      queryClient.invalidateQueries({ queryKey: ['userVocab', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['vocabStats', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['recentVocab'] });
    },
    onError: (error, variables) => {
      toast.error(`Failed to delete "${variables.lemma}"`);
    },
  });
}

/**
 * Hook to toggle mastered status for a word
 * Returns the new mastered status
 * DEPRECATED: Use useAddVocabTag/useRemoveVocabTag instead
 */
export function useToggleVocabMastered() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lemma,
      language,
    }: {
      lemma: string;
      language: LangCode;
    }) => {
      const result = await toggleVocabMastered(lemma, language);
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle mastered status');
      }
      return { lemma, newMastered: result.data! }; // Return both lemma and new status
    },
    onSuccess: (data, variables) => {
      // Show success toast
      const message = data.newMastered
        ? `"${data.lemma}" marked as mastered`
        : `"${data.lemma}" marked as needs practice`;
      toast.success(message);

      // Invalidate vocabulary and stats queries to refetch
      queryClient.invalidateQueries({ queryKey: ['userVocab', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['vocabStats', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['recentVocab'] });
    },
    onError: (error, variables) => {
      toast.error(`Failed to update "${variables.lemma}"`);
    },
  });
}

/**
 * Hook to add a tag to a word
 * Tags are mutually exclusive - adding a new tag removes any existing tag
 */
export function useAddVocabTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lemma,
      language,
      tag,
    }: {
      lemma: string;
      language: LangCode;
      tag: string;
    }) => {
      const result = await addVocabTag(lemma, language, tag);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add tag');
      }
      return { lemma, tags: result.data! };
    },
    onSuccess: (data, variables) => {
      // Show toast based on tag type
      const tagName = variables.tag === 'needs-practice' ? 'needs practice' :
                      variables.tag === 'mastered' ? 'mastered' : variables.tag;
      toast.success(`"${data.lemma}" marked as ${tagName}`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['userVocab', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['vocabStats', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['recentVocab'] });
      queryClient.invalidateQueries({ queryKey: ['vocabByTag'] });
    },
    onError: (error, variables) => {
      toast.error(`Failed to tag "${variables.lemma}"`);
    },
  });
}

/**
 * Hook to remove a tag from a word
 */
export function useRemoveVocabTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lemma,
      language,
      tag,
    }: {
      lemma: string;
      language: LangCode;
      tag: string;
    }) => {
      const result = await removeVocabTag(lemma, language, tag);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove tag');
      }
      return { lemma, tags: result.data! };
    },
    onSuccess: (data, variables) => {
      toast.success(`Tag removed from "${data.lemma}"`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['userVocab', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['vocabStats', variables.language] });
      queryClient.invalidateQueries({ queryKey: ['recentVocab'] });
      queryClient.invalidateQueries({ queryKey: ['vocabByTag'] });
    },
    onError: (error, variables) => {
      toast.error(`Failed to remove tag from "${variables.lemma}"`);
    },
  });
}

/**
 * Hook to get vocabulary filtered by tag
 */
export function useVocabByTag(language: LangCode, tag: string, enabled = true) {
  return useQuery({
    queryKey: ['vocabByTag', language, tag],
    queryFn: async () => {
      const result = await getVocabByTag(language, tag);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get vocabulary');
      }
      return result.data!;
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}
