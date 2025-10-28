// Type definitions for language pack services

/**
 * Supported language codes
 */
export type LangCode = 'es' | 'en' | 'fr' | 'de';

/**
 * Result from processing a single word through the full pipeline
 */
export interface WordResult {
  /** Original word as spoken/written */
  word: string;
  /** Base form (lemma) of the word */
  lemma: string;
  /** Translation in target language (null if not found) */
  translation: string | null;
}

/**
 * Result tuple from lemmatization batch operation
 * [originalWord, lemma]
 */
export type LemmaBatchResult = [string, string];

/**
 * Result tuple from translation batch operation
 * [lemma, translation | null]
 */
export type TranslationBatchResult = [string, string | null];

/**
 * Service operation result with success/error handling
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
