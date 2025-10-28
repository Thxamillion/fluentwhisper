/**
 * Tokenization service - converts text into word arrays
 *
 * Pure functions with no React dependencies
 */

import type { LangCode, TokenizationOptions } from './types';

const DEFAULT_OPTIONS: TokenizationOptions = {
  lowercase: true,
  removePunctuation: true,
  keepHyphens: true,
  keepApostrophes: true,
};

/**
 * Tokenize text into words based on language-specific rules
 *
 * @param text - The text to tokenize
 * @param lang - Language code for language-specific processing
 * @param options - Tokenization options
 * @returns Array of word tokens
 */
export function tokenize(
  text: string,
  lang: LangCode,
  options: TokenizationOptions = {}
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Step 1: Handle language-specific contractions/preprocessing
  let processed = lang === 'es' ? preprocessSpanish(text) : text;

  // Step 2: Normalize whitespace
  processed = processed.trim().replace(/\s+/g, ' ');

  // Step 3: Split on whitespace initially
  let tokens = processed.split(' ');

  // Step 4: Handle punctuation
  if (opts.removePunctuation) {
    tokens = tokens.map(token => cleanPunctuation(token, opts));
  }

  // Step 5: Filter out empty strings
  tokens = tokens.filter(token => token.length > 0);

  // Step 6: Lowercase if requested
  if (opts.lowercase) {
    tokens = tokens.map(token => token.toLowerCase());
  }

  return tokens;
}

/**
 * Spanish-specific preprocessing
 * Handles contractions like "del" → "de el", "al" → "a el"
 */
function preprocessSpanish(text: string): string {
  // Spanish contractions (common ones)
  // Note: We expand contractions so each word can be lemmatized separately
  return text
    .replace(/\bdel\b/gi, 'de el')
    .replace(/\bal\b/gi, 'a el');
}

/**
 * Remove punctuation from a token while preserving hyphens and apostrophes if configured
 */
function cleanPunctuation(
  token: string,
  options: TokenizationOptions
): string {
  // Build regex pattern based on options
  // We want to remove punctuation but keep hyphens/apostrophes if requested
  // NOTE: Using Unicode property escapes to include accented characters (á, é, í, ó, ú, ñ, etc.)

  if (options.keepHyphens && options.keepApostrophes) {
    // Keep both hyphens and apostrophes
    // Remove everything except letters (including accented), numbers, hyphens, and apostrophes
    return token.replace(/[^\p{L}\p{N}'-]/gu, '');
  } else if (options.keepHyphens) {
    // Keep only hyphens
    return token.replace(/[^\p{L}\p{N}-]/gu, '');
  } else if (options.keepApostrophes) {
    // Keep only apostrophes
    return token.replace(/[^\p{L}\p{N}']/gu, '');
  } else {
    // Remove all non-letter and non-number characters
    return token.replace(/[^\p{L}\p{N}]/gu, '');
  }
}

/**
 * Tokenize and return statistics about the text
 */
export interface TokenStats {
  tokens: string[];
  uniqueTokens: string[];
  totalCount: number;
  uniqueCount: number;
}

export function tokenizeWithStats(
  text: string,
  lang: LangCode,
  options: TokenizationOptions = {}
): TokenStats {
  const tokens = tokenize(text, lang, options);
  const uniqueTokens = Array.from(new Set(tokens));

  return {
    tokens,
    uniqueTokens,
    totalCount: tokens.length,
    uniqueCount: uniqueTokens.length,
  };
}
