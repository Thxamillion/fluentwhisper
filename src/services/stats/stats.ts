/**
 * Stats service - wraps Tauri commands for stats and analytics
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  OverallStats,
  TopWord,
  DailySessionCount,
  WpmTrend,
  VocabGrowth,
} from './types';

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get overall statistics
 */
export async function getOverallStats(
  language?: string
): Promise<ServiceResult<OverallStats>> {
  try {
    const stats = await invoke<OverallStats>('get_stats_overall', {
      language: language || null,
    });
    return { success: true, data: stats };
  } catch (error) {
    console.error('Failed to get overall stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get top N most practiced words
 */
export async function getTopWords(
  language: string,
  limit: number = 10
): Promise<ServiceResult<TopWord[]>> {
  try {
    const words = await invoke<TopWord[]>('get_stats_top_words', {
      language,
      limit,
    });
    return { success: true, data: words };
  } catch (error) {
    console.error('Failed to get top words:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get daily session counts for calendar/streaks
 */
export async function getDailySessions(
  language?: string,
  days?: number
): Promise<ServiceResult<DailySessionCount[]>> {
  try {
    const counts = await invoke<DailySessionCount[]>('get_stats_daily_sessions', {
      language: language || null,
      days: days || null,
    });
    return { success: true, data: counts };
  } catch (error) {
    console.error('Failed to get daily sessions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get WPM trends over time
 */
export async function getWpmTrends(
  language?: string,
  days?: number
): Promise<ServiceResult<WpmTrend[]>> {
  try {
    const trends = await invoke<WpmTrend[]>('get_stats_wpm_trends', {
      language: language || null,
      days: days || null,
    });
    return { success: true, data: trends };
  } catch (error) {
    console.error('Failed to get WPM trends:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get vocabulary growth over time
 */
export async function getVocabGrowth(
  language: string
): Promise<ServiceResult<VocabGrowth[]>> {
  try {
    const growth = await invoke<VocabGrowth[]>('get_stats_vocab_growth', {
      language,
    });
    return { success: true, data: growth };
  } catch (error) {
    console.error('Failed to get vocab growth:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
