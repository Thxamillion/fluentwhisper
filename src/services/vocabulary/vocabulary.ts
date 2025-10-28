/**
 * Vocabulary service - wraps Tauri commands for vocabulary operations
 * Pure functions, no React dependencies
 */

import { invoke } from '@tauri-apps/api/core';
import type { LangCode, VocabWord, VocabStats, ServiceResult } from './types';

/**
 * Record a word in user's vocabulary
 * Returns true if word is new, false if already existed
 */
export async function recordWord(
  lemma: string,
  language: LangCode,
  formSpoken: string
): Promise<ServiceResult<boolean>> {
  try {
    const isNew = await invoke<boolean>('record_word', {
      lemma,
      language,
      formSpoken,
    });
    return { success: true, data: isNew };
  } catch (error) {
    console.error('[recordWord] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all vocabulary for a language
 */
export async function getUserVocab(
  language: LangCode
): Promise<ServiceResult<VocabWord[]>> {
  try {
    const vocab = await invoke<VocabWord[]>('get_user_vocab', { language });
    return { success: true, data: vocab };
  } catch (error) {
    console.error('[getUserVocab] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a word is new (not in vocabulary)
 */
export async function isNewWord(
  lemma: string,
  language: LangCode
): Promise<ServiceResult<boolean>> {
  try {
    const isNew = await invoke<boolean>('is_new_word', { lemma, language });
    return { success: true, data: isNew };
  } catch (error) {
    console.error('[isNewWord] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get vocabulary statistics for a language
 */
export async function getVocabStats(
  language: LangCode
): Promise<ServiceResult<VocabStats>> {
  try {
    const stats = await invoke<VocabStats>('get_vocab_stats', { language });
    return { success: true, data: stats };
  } catch (error) {
    console.error('[getVocabStats] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
