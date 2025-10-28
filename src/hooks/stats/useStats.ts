/**
 * React Query hooks for stats and analytics
 */

import { useQuery } from '@tanstack/react-query';
import { statsService } from '../../services/stats';

/**
 * Hook to get overall statistics
 */
export function useOverallStats(language?: string) {
  return useQuery({
    queryKey: ['stats', 'overall', language],
    queryFn: async () => {
      const result = await statsService.getOverallStats(language);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get top practiced words
 */
export function useTopWords(language: string, limit: number = 10) {
  return useQuery({
    queryKey: ['stats', 'topWords', language, limit],
    queryFn: async () => {
      const result = await statsService.getTopWords(language, limit);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get daily session counts
 */
export function useDailySessions(language?: string, days?: number) {
  return useQuery({
    queryKey: ['stats', 'dailySessions', language, days],
    queryFn: async () => {
      const result = await statsService.getDailySessions(language, days);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get WPM trends
 */
export function useWpmTrends(language?: string, days?: number) {
  return useQuery({
    queryKey: ['stats', 'wpmTrends', language, days],
    queryFn: async () => {
      const result = await statsService.getWpmTrends(language, days);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get vocabulary growth
 */
export function useVocabGrowth(language: string) {
  return useQuery({
    queryKey: ['stats', 'vocabGrowth', language],
    queryFn: async () => {
      const result = await statsService.getVocabGrowth(language);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minute
  });
}
