/**
 * Hook to fetch installed language packs
 */

import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export function useInstalledLanguages() {
  return useQuery({
    queryKey: ['installedLanguages'],
    queryFn: async () => {
      const installed = await invoke<string[]>('get_installed_languages');
      return installed;
    },
    staleTime: 30000, // 30 seconds
  });
}
