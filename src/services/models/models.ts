/**
 * Whisper model management service - wraps Tauri commands
 * Pure functions, no React dependencies
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  WhisperModel,
  DownloadProgress,
  InstalledModelInfo,
  ServiceResult,
} from './types';

/**
 * Get list of available Whisper models
 */
export async function getAvailableModels(): Promise<
  ServiceResult<WhisperModel[]>
> {
  try {
    const models = await invoke<WhisperModel[]>('get_whisper_models');
    return { success: true, data: models };
  } catch (error) {
    console.error('[getAvailableModels] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a specific model is installed
 */
export async function checkModelInstalled(
  modelName: string
): Promise<ServiceResult<boolean>> {
  try {
    const isInstalled = await invoke<boolean>('check_model_installed', {
      modelName,
    });
    return { success: true, data: isInstalled };
  } catch (error) {
    console.error('[checkModelInstalled] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if the default model (base) is installed
 */
export async function checkDefaultModelInstalled(): Promise<
  ServiceResult<boolean>
> {
  try {
    const isInstalled = await invoke<boolean>('check_default_model_installed');
    return { success: true, data: isInstalled };
  } catch (error) {
    console.error('[checkDefaultModelInstalled] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the default model name
 */
export async function getDefaultModelName(): Promise<ServiceResult<string>> {
  try {
    const name = await invoke<string>('get_default_whisper_model');
    return { success: true, data: name };
  } catch (error) {
    console.error('[getDefaultModelName] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get path to a specific model file
 */
export async function getModelPath(
  modelName: string
): Promise<ServiceResult<string>> {
  try {
    const path = await invoke<string>('get_whisper_model_path', { modelName });
    return { success: true, data: path };
  } catch (error) {
    console.error('[getModelPath] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get list of installed models
 */
export async function getInstalledModels(): Promise<
  ServiceResult<InstalledModelInfo[]>
> {
  try {
    const models = await invoke<InstalledModelInfo[]>(
      'get_installed_whisper_models'
    );
    return { success: true, data: models };
  } catch (error) {
    console.error('[getInstalledModels] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download a Whisper model with progress callback
 */
export async function downloadModel(
  modelName: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<ServiceResult<string>> {
  try {
    // Set up progress listener if callback provided
    let unlisten: (() => void) | undefined;
    if (onProgress) {
      unlisten = await listen<DownloadProgress>(
        'model-download-progress',
        (event) => {
          onProgress(event.payload);
        }
      );
    }

    // Start download
    const path = await invoke<string>('download_whisper_model', { modelName });

    // Clean up listener
    if (unlisten) {
      unlisten();
    }

    return { success: true, data: path };
  } catch (error) {
    console.error('[downloadModel] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a downloaded model
 */
export async function deleteModel(
  modelName: string
): Promise<ServiceResult<void>> {
  try {
    await invoke('delete_whisper_model', { modelName });
    return { success: true };
  } catch (error) {
    console.error('[deleteModel] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a download is currently in progress
 */
export async function isDownloadInProgress(): Promise<ServiceResult<boolean>> {
  try {
    const inProgress = await invoke<boolean>('is_download_in_progress');
    return { success: true, data: inProgress };
  } catch (error) {
    console.error('[isDownloadInProgress] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
