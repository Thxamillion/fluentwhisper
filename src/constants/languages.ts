import { LangCode } from '../types/language-packs';

/**
 * Centralized language definitions for the application.
 * This is the single source of truth for all language dropdowns and selections.
 *
 * Languages listed here match the available language packs in public/language-packs.json
 */

export interface Language {
  code: LangCode;
  name: string;
  nativeName?: string;
}

/**
 * All supported languages in the application.
 * Use this constant for all language dropdowns and selections.
 */
export const SUPPORTED_LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
] as const;

/**
 * Map of language codes to language names for quick lookups
 */
export const LANGUAGE_NAME_MAP: Record<LangCode, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ru: 'Russian',
  // Types include these but they're not yet available in language packs
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
};

/**
 * Get language name from code
 */
export function getLanguageName(code: LangCode): string {
  return LANGUAGE_NAME_MAP[code] || code;
}
