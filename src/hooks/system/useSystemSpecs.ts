/**
 * React Query hook for system specifications
 */

import { useQuery } from '@tanstack/react-query';
import * as systemService from '@/services/system';

/**
 * Get system specifications and model recommendation
 *
 * Returns:
 * - Total RAM in GB
 * - CPU core count
 * - CPU brand/model (e.g., "Apple M1")
 * - Recommended Whisper model for this system
 *
 * This data is cached for 1 hour since system specs don't change
 */
export function useSystemSpecs() {
  return useQuery({
    queryKey: ['system', 'specs'],
    queryFn: async () => {
      const result = await systemService.getSystemSpecs();
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    // Cache for 1 hour - system specs don't change during app runtime
    staleTime: 1000 * 60 * 60,
  });
}
