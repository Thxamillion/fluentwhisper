/**
 * Hook to check if required language packs are installed
 */

import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { RequiredPacks } from '@/types/language-packs';

interface UseLanguagePackStatusOptions {
  primaryLanguage: string;
  targetLanguage: string;
  enabled?: boolean;
}

export function useLanguagePackStatus({
  primaryLanguage,
  targetLanguage,
  enabled = true,
}: UseLanguagePackStatusOptions) {
  return useQuery({
    queryKey: ['languagePackStatus', primaryLanguage, targetLanguage],
    queryFn: async () => {
      const required = await invoke<RequiredPacks>('get_required_packs', {
        primaryLang: primaryLanguage,
        targetLang: targetLanguage,
      });

      // Check if anything is missing
      const isMissing = required.lemmas.length > 0 || required.translations.length > 0;

      return {
        required,
        isMissing,
        missingLemmas: required.lemmas,
        missingTranslations: required.translations,
      };
    },
    enabled: enabled && !!primaryLanguage && !!targetLanguage,
    staleTime: 1000 * 30, // 30 seconds
  });
}
