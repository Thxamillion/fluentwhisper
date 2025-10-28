import { invoke } from '@tauri-apps/api/core';
import type { LangCode, LemmaBatchResult, ServiceResult } from './types';

/**
 * Gets the lemma (base form) for a single word
 *
 * @param word - The inflected word (e.g., "estás", "running")
 * @param lang - Language code (e.g., "es", "en")
 * @returns Lemma if found, null if word is already base form, error if operation fails
 *
 * @example
 * const lemma = await getLemma("estás", "es");
 * // Returns: "estar"
 */
export async function getLemma(
  word: string,
  lang: LangCode
): Promise<ServiceResult<string | null>> {
  try {
    const result = await invoke<string | null>('get_lemma', {
      word,
      lang,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[getLemma] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Lemmatizes multiple words in a single batch operation
 *
 * More efficient than calling getLemma multiple times.
 *
 * @param words - Array of words to lemmatize
 * @param lang - Language code
 * @returns Array of [word, lemma] tuples
 *
 * @example
 * const results = await lemmatizeBatch(["estoy", "corriendo"], "es");
 * // Returns: [["estoy", "estar"], ["corriendo", "correr"]]
 */
export async function lemmatizeBatch(
  words: string[],
  lang: LangCode
): Promise<ServiceResult<LemmaBatchResult[]>> {
  try {
    const result = await invoke<LemmaBatchResult[]>('lemmatize_batch', {
      words,
      lang,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[lemmatizeBatch] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
