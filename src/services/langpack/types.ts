// Type definitions for language pack services

/**
 * Supported language codes
 */
export type LangCode = 'es' | 'en' | 'fr' | 'de';

/**
 * Result tuple from lemmatization batch operation
 * [originalWord, lemma]
 */
export type LemmaBatchResult = [string, string];

/**
 * Service operation result with success/error handling
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
