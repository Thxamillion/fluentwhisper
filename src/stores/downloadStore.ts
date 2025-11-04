/**
 * Global download state store
 * Tracks active downloads (language packs + Whisper models) across all pages
 */

import { create } from 'zustand';

export type DownloadType = 'language-pack' | 'whisper-model';

export interface DownloadProgress {
  // Common fields for both types
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
  speed_mbps?: number;

  // Language pack specific
  file_type?: string;        // "lemmas" or "translations"
  language_pair?: string;    // "es" or "es-en"

  // Model specific
  model_name?: string;       // "base", "small", etc.
}

export interface ActiveDownload {
  type: DownloadType;
  progress: DownloadProgress;
  name: string; // Friendly display name
}

interface DownloadState {
  // Current active download (only one at a time for now)
  activeDownload: ActiveDownload | null;

  // Track if download is in progress
  isDownloading: boolean;

  // Error state
  error: string | null;

  // Actions
  setLanguagePackProgress: (progress: DownloadProgress, name: string) => void;
  setModelProgress: (progress: DownloadProgress, modelName: string) => void;
  setDownloading: (isDownloading: boolean) => void;
  setError: (error: string | null) => void;
  clearDownload: () => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  activeDownload: null,
  isDownloading: false,
  error: null,

  setLanguagePackProgress: (progress, name) =>
    set({
      activeDownload: { type: 'language-pack', progress, name },
      isDownloading: true,
      error: null
    }),

  setModelProgress: (progress, modelName) =>
    set({
      activeDownload: {
        type: 'whisper-model',
        progress: { ...progress, model_name: modelName },
        name: `Whisper ${modelName.charAt(0).toUpperCase() + modelName.slice(1)} Model`
      },
      isDownloading: true,
      error: null
    }),

  setDownloading: (isDownloading) =>
    set({ isDownloading }),

  setError: (error) =>
    set({ error, isDownloading: false }),

  clearDownload: () =>
    set({ activeDownload: null, isDownloading: false, error: null }),
}));
