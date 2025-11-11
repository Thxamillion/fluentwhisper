/**
 * Updater Service - Auto-update functionality
 *
 * Pure functions for checking and installing app updates.
 * Follows three-layer architecture from CLAUDE.md.
 */

import { check } from '@tauri-apps/plugin-updater';

export interface UpdateInfo {
  available: boolean;
  version?: string;
  date?: string;
  body?: string;
  currentVersion: string;
}

export interface UpdateCheckResult {
  success: boolean;
  update?: UpdateInfo;
  error?: string;
}

export interface UpdateInstallResult {
  success: boolean;
  error?: string;
}

/**
 * Check for available updates
 *
 * @returns Result with update info if available
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    const update = await check();

    if (update === null) {
      // No update available
      return {
        success: true,
        update: {
          available: false,
          currentVersion: await getCurrentVersion(),
        },
      };
    }

    return {
      success: true,
      update: {
        available: true,
        version: update.version,
        date: update.date,
        body: update.body,
        currentVersion: await getCurrentVersion(),
      },
    };
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download and install an update
 *
 * Note: The app will automatically relaunch after the update is installed.
 * This is handled by the Tauri updater plugin.
 *
 * @returns Result indicating success or failure
 */
export async function installUpdate(): Promise<UpdateInstallResult> {
  try {
    const update = await check();

    if (update === null) {
      return {
        success: false,
        error: 'No update available',
      };
    }

    // Download and install the update
    // The app will automatically relaunch after installation
    await update.downloadAndInstall();

    return {
      success: true,
    };
  } catch (error) {
    console.error('Failed to install update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the current app version
 *
 * @returns Current version string
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    return await getVersion();
  } catch (error) {
    console.error('Failed to get app version:', error);
    return '1.0.0'; // Fallback to default version
  }
}
