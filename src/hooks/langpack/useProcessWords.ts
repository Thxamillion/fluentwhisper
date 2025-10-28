import { useQuery } from '@tanstack/react-query';
import { processWords } from '../../services/langpack';
import type { LangCode, WordResult } from '../../services/langpack/types';

/**
 * React Query hook for processing words through lemmatization + translation pipeline
 *
 * @param words - Array of words to process
 * @param lang - Source language code
 * @param targetLang - Target language code
 * @param enabled - Whether query should run (default: true)
 *
 * @example
 * const { data, isLoading, error } = useProcessWords(
 *   ["estoy", "corriendo"],
 *   "es",
 *   "en"
 * );
 */
export function useProcessWords(
  words: string[],
  lang: LangCode,
  targetLang: LangCode,
  enabled = true
) {
  return useQuery({
    queryKey: ['processWords', words, lang, targetLang],
    queryFn: async () => {
      const result = await processWords(words, lang, targetLang);

      if (!result.success) {
        throw new Error(result.error || 'Failed to process words');
      }

      return result.data as WordResult[];
    },
    enabled: enabled && words.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
