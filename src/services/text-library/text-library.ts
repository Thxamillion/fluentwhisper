/**
 * Text Library service
 * Wraps Tauri commands for text library operations
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  TextLibraryItem,
  CreateTextLibraryItemInput,
  UpdateTextLibraryItemInput,
} from './types';

/**
 * Create a new text library item
 */
export async function createTextLibraryItem(
  input: CreateTextLibraryItemInput
): Promise<TextLibraryItem> {
  return invoke<TextLibraryItem>('create_text_library_item_command', { item: input });
}

/**
 * Get a single text library item by ID
 */
export async function getTextLibraryItem(id: string): Promise<TextLibraryItem> {
  return invoke<TextLibraryItem>('get_text_library_item_command', { id });
}

/**
 * Get all text library items
 */
export async function getAllTextLibraryItems(): Promise<TextLibraryItem[]> {
  return invoke<TextLibraryItem[]>('get_all_text_library_items_command');
}

/**
 * Get text library items filtered by language
 */
export async function getTextLibraryByLanguage(language: string): Promise<TextLibraryItem[]> {
  return invoke<TextLibraryItem[]>('get_text_library_by_language_command', { language });
}

/**
 * Update a text library item
 */
export async function updateTextLibraryItem(
  id: string,
  updates: UpdateTextLibraryItemInput
): Promise<TextLibraryItem> {
  return invoke<TextLibraryItem>('update_text_library_item_command', { id, updates });
}

/**
 * Delete a text library item
 */
export async function deleteTextLibraryItem(id: string): Promise<void> {
  return invoke<void>('delete_text_library_item_command', { id });
}
