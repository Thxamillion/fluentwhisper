/**
 * Updater Service - Handles app updates using Tauri's updater plugin
 */

import { check } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  version?: string;
  date?: string;
  body?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DownloadProgress {
  phase: 'downloading' | 'installing' | 'restarting' | 'manual-restart';
  bytesDownloaded?: number;
  totalBytes?: number;
  percent?: number;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<ServiceResult<UpdateInfo>> {
  try {
    const currentVersion = await getVersion();
    const update = await check();

    if (update) {
      return {
        success: true,
        data: {
          available: true,
          currentVersion,
          version: update.version,
          date: update.date,
          body: update.body,
        },
      };
    }

    return {
      success: true,
      data: {
        available: false,
        currentVersion,
      },
    };
  } catch (error) {
    console.error('Update check failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check for updates',
    };
  }
}

/**
 * Install an available update with progress tracking
 */
export async function installUpdate(
  onProgress?: ProgressCallback
): Promise<ServiceResult<void>> {
  try {
    const update = await check();

    if (!update) {
      return {
        success: false,
        error: 'No update available',
      };
    }

    let totalBytes = 0;
    let downloadedBytes = 0;

    // Download and install the update with progress tracking
    await update.downloadAndInstall((event) => {
      if (!onProgress) return;

      switch (event.event) {
        case 'Started':
          totalBytes = event.data.contentLength || 0;
          onProgress({
            phase: 'downloading',
            bytesDownloaded: 0,
            totalBytes,
            percent: 0,
          });
          break;

        case 'Progress':
          downloadedBytes += event.data.chunkLength || 0;
          const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          onProgress({
            phase: 'downloading',
            bytesDownloaded: downloadedBytes,
            totalBytes,
            percent,
          });
          break;

        case 'Finished':
          onProgress({
            phase: 'installing',
            bytesDownloaded: totalBytes,
            totalBytes,
            percent: 100,
          });
          break;
      }
    });

    // Notify that we're restarting
    onProgress?.({ phase: 'restarting' });

    // Try to restart the app automatically
    try {
      await relaunch();
    } catch (restartError) {
      console.error('Auto-restart failed:', restartError);
      // If restart fails, tell user to restart manually
      onProgress?.({ phase: 'manual-restart' });

      // Wait 5 seconds before showing manual restart message
      await new Promise(resolve => setTimeout(resolve, 5000));

      return {
        success: true,
        data: undefined,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Update installation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to install update',
    };
  }
}

/**
 * Get the current app version
 */
export async function getCurrentVersion(): Promise<string> {
  return getVersion();
}
