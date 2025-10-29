/**
 * Sessions service - wraps Tauri commands for session management
 */

import { invoke } from '@tauri-apps/api/core';
import type { SessionData, SessionWord } from './types';

/**
 * Get all sessions (all languages)
 */
export async function getAllSessions(): Promise<{ success: boolean; data?: SessionData[]; error?: string }> {
  try {
    const sessions = await invoke<SessionData[]>('get_all_sessions_command');
    return { success: true, data: sessions };
  } catch (error) {
    console.error('Failed to get all sessions:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get a single session by ID
 */
export async function getSession(sessionId: string): Promise<{ success: boolean; data?: SessionData; error?: string }> {
  try {
    console.log('Fetching session with ID:', sessionId);
    const session = await invoke<SessionData>('get_session_command', { sessionId });
    console.log('Session fetched successfully:', session);
    return { success: true, data: session };
  } catch (error) {
    console.error('Failed to get session:', error);
    console.error('Session ID was:', sessionId);
    return { success: false, error: String(error) };
  }
}

/**
 * Get sessions filtered by language
 */
export async function getSessionsByLanguage(language: string): Promise<{ success: boolean; data?: SessionData[]; error?: string }> {
  try {
    const sessions = await invoke<SessionData[]>('get_sessions_by_language_command', { language });
    return { success: true, data: sessions };
  } catch (error) {
    console.error('Failed to get sessions by language:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get vocabulary words for a session
 */
export async function getSessionWords(sessionId: string): Promise<{ success: boolean; data?: SessionWord[]; error?: string }> {
  try {
    const words = await invoke<SessionWord[]>('get_session_words_command', { sessionId });
    return { success: true, data: words };
  } catch (error) {
    console.error('Failed to get session words:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a session and its related data
 */
export async function deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[deleteSession] Deleting session:', sessionId);
    await invoke('delete_session_command', { sessionId });
    console.log('[deleteSession] Session deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[deleteSession] Failed to delete session:', error);
    return { success: false, error: String(error) };
  }
}

export const sessionsService = {
  getAllSessions,
  getSession,
  getSessionsByLanguage,
  getSessionWords,
  deleteSession,
};
