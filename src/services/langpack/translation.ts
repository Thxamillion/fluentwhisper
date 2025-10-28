import { invoke } from '@tauri-apps/api/core';
import type { LangCode, TranslationBatchResult, ServiceResult } from './types';

/**
 * Gets translation for a single lemma (base form)
 *
 * @param lemma - The base form of the word (e.g., "estar", "run")
 * @param fromLang - Source language code
 * @param toLang - Target language code
 * @returns Translation if found, null if not available
 *
 * @example
 * const translation = await getTranslation("estar", "es", "en");
 * // Returns: "to be"
 */
export async function getTranslation(
  lemma: string,
  fromLang: LangCode,
  toLang: LangCode
): Promise<ServiceResult<string | null>> {
  try {
    const result = await invoke<string | null>('get_translation', {
      lemma,
      fromLang,
      toLang,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[getTranslation] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Translates multiple lemmas in a single batch operation
 *
 * More efficient than calling getTranslation multiple times.
 *
 * @param lemmas - Array of lemmas to translate
 * @param fromLang - Source language code
 * @param toLang - Target language code
 * @returns Array of [lemma, translation | null] tuples
 *
 * @example
 * const results = await translateBatch(["estar", "correr"], "es", "en");
 * // Returns: [["estar", "to be"], ["correr", "to run"]]
 */
export async function translateBatch(
  lemmas: string[],
  fromLang: LangCode,
  toLang: LangCode
): Promise<ServiceResult<TranslationBatchResult[]>> {
  try {
    const result = await invoke<TranslationBatchResult[]>('translate_batch', {
      lemmas,
      fromLang,
      toLang,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[translateBatch] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
