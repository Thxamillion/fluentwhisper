/**
 * Type definitions for Whisper model management
 */

export interface WhisperModel {
  name: string;
  displayName: string;
  fileName: string;
  url: string;
  sizeMb: number;
  description: string;
}

export interface DownloadProgress {
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  isComplete: boolean;
}

export interface InstalledModelInfo {
  name: string;
  displayName: string;
  sizeBytes: number;
  path: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
