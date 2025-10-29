/**
 * React Query hooks for sessions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsService } from '@/services/sessions';

/**
 * Hook to get all sessions
 */
export function useAllSessions() {
  return useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: async () => {
      const result = await sessionsService.getAllSessions();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get a single session by ID
 */
export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', 'detail', sessionId],
    queryFn: async () => {
      console.log('[useSession] Fetching session:', sessionId);
      const result = await sessionsService.getSession(sessionId);
      console.log('[useSession] Result:', result);
      if (!result.success) {
        console.error('[useSession] Error:', result.error);
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minute
    enabled: !!sessionId,
  });
}

/**
 * Hook to get sessions by language
 */
export function useSessionsByLanguage(language: string) {
  return useQuery({
    queryKey: ['sessions', 'byLanguage', language],
    queryFn: async () => {
      const result = await sessionsService.getSessionsByLanguage(language);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds
    enabled: !!language,
  });
}

/**
 * Hook to get vocabulary words for a session
 */
export function useSessionWords(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', 'words', sessionId],
    queryFn: async () => {
      const result = await sessionsService.getSessionWords(sessionId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minute
    enabled: !!sessionId,
  });
}

/**
 * Hook to delete a session
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      console.log('[useDeleteSession] Mutation function called with:', sessionId);
      const result = await sessionsService.deleteSession(sessionId);
      console.log('[useDeleteSession] Result:', result);
      if (!result.success) {
        console.error('[useDeleteSession] Delete failed:', result.error);
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      console.log('[useDeleteSession] onSuccess callback - invalidating queries');
      // Invalidate all session queries to refetch
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      // Also invalidate stats since deleting a session affects stats
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
