import { invoke } from '@tauri-apps/api/core';
import type { LangCode, WordResult, ServiceResult } from './types';

// Re-export types
export * from './types';

// Re-export service functions
export * from './lemmatization';
export * from './translation';

/**
 * Processes words through the complete pipeline: lemmatization → translation
 *
 * This is the main entry point for processing transcribed speech.
 *
 * @param words - Array of words to process
 * @param lang - Source language code
 * @param targetLang - Target language for translations
 * @returns Array of WordResult objects with original word, lemma, and translation
 *
 * @example
 * const results = await processWords(
 *   ["estoy", "corriendo", "rápido"],
 *   "es",
 *   "en"
 * );
 * // Returns: [
 * //   { word: "estoy", lemma: "estar", translation: "to be" },
 * //   { word: "corriendo", lemma: "correr", translation: "to run" },
 * //   { word: "rápido", lemma: "rápido", translation: "fast" }
 * // ]
 */
export async function processWords(
  words: string[],
  lang: LangCode,
  targetLang: LangCode
): Promise<ServiceResult<WordResult[]>> {
  try {
    const result = await invoke<WordResult[]>('process_words', {
      words,
      lang,
      targetLang,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[processWords] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
