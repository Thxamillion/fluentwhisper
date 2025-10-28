/**
 * Type definitions for text processing services
 */

export type LangCode = 'es' | 'en' | 'fr' | 'de';

export interface TokenizationOptions {
  /**
   * Convert tokens to lowercase
   * @default true
   */
  lowercase?: boolean;

  /**
   * Remove punctuation from tokens
   * @default true
   */
  removePunctuation?: boolean;

  /**
   * Keep hyphenated words as single tokens (e.g., "well-being")
   * @default true
   */
  keepHyphens?: boolean;

  /**
   * Keep apostrophe contractions as single tokens (e.g., "don't")
   * @default true
   */
  keepApostrophes?: boolean;
}
