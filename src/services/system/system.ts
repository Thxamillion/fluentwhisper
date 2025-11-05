/**
 * System information service - wraps Tauri commands
 * Pure functions, no React dependencies
 */

import { invoke } from '@tauri-apps/api/core';
import type { SystemSpecs, ServiceResult } from './types';

/**
 * Get system specifications and model recommendation
 *
 * Returns:
 * - Total RAM in GB
 * - CPU core count
 * - CPU brand/model
 * - Recommended Whisper model for this system
 */
export async function getSystemSpecs(): Promise<ServiceResult<SystemSpecs>> {
  try {
    const specs = await invoke<SystemSpecs>('get_system_specs');
    return { success: true, data: specs };
  } catch (error) {
    console.error('[getSystemSpecs] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
