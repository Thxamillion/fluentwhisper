/**
 * Dictionary service - wraps Tauri commands for dictionary operations
 * Pure functions, no React dependencies
 */

import { invoke } from '@tauri-apps/api/core';
import type { Dictionary, DictType, ServiceResult } from './types';

/**
 * Get all dictionaries for a language
 */
export async function getDictionaries(
  language: string
): Promise<ServiceResult<Dictionary[]>> {
  try {
    const dictionaries = await invoke<Dictionary[]>('get_dictionaries', {
      language,
    });
    return { success: true, data: dictionaries };
  } catch (error) {
    console.error('[getDictionaries] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update dictionary active status
 */
export async function updateDictionaryActive(
  id: number,
  isActive: boolean
): Promise<ServiceResult<void>> {
  try {
    await invoke('update_dictionary_active', {
      id,
      isActive,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateDictionaryActive] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update dictionary sort order
 */
export async function updateDictionarySortOrder(
  id: number,
  sortOrder: number
): Promise<ServiceResult<void>> {
  try {
    await invoke('update_dictionary_sort_order', {
      id,
      sortOrder,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateDictionarySortOrder] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reorder dictionaries for a language
 * Takes a list of dictionary IDs in desired order
 */
export async function reorderDictionaries(
  dictionaryIds: number[]
): Promise<ServiceResult<void>> {
  try {
    await invoke('reorder_dictionaries', {
      dictionaryIds,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[reorderDictionaries] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add a custom dictionary
 */
export async function addDictionary(
  language: string,
  name: string,
  urlTemplate: string,
  dictType: DictType
): Promise<ServiceResult<number>> {
  try {
    const id = await invoke<number>('add_dictionary', {
      language,
      name,
      urlTemplate,
      dictType,
    });
    return { success: true, data: id };
  } catch (error) {
    console.error('[addDictionary] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a custom dictionary
 * Only allows deleting non-default dictionaries
 */
export async function deleteDictionary(
  id: number
): Promise<ServiceResult<void>> {
  try {
    await invoke('delete_dictionary', { id });
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteDictionary] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Replace [WORD] placeholder with actual word in URL template
 */
export function buildLookupUrl(urlTemplate: string, word: string): string {
  // Remove zero-width spaces that might be in the word
  const zeroWidthSpace = '\u200b';
  const cleanWord = word
    .replace(new RegExp(zeroWidthSpace, 'g'), '')
    .replace(/\s+/g, ' ')
    .trim();

  const encodedWord = encodeURIComponent(cleanWord);
  return urlTemplate.replace('[WORD]', encodedWord);
}
