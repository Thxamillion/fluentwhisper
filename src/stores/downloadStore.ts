/**
 * Global download state store
 * Tracks active downloads (language packs + Whisper models) across all pages
 */

import { create } from 'zustand';

export type DownloadType = 'language-pack' | 'whisper-model';

export interface DownloadProgress {
  // Common fields for both types
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  speedMbps?: number;

  // Language pack specific
  fileType?: string;        // "lemmas" or "translations"
  languagePair?: string;    // "es" or "es-en"

  // Model specific
  modelName?: string;       // "base", "small", etc.
}

export interface ActiveDownload {
  id: string; // Unique identifier for this download
  type: DownloadType;
  progress: DownloadProgress;
  name: string; // Friendly display name
}

interface DownloadState {
  // Multiple concurrent downloads
  activeDownloads: ActiveDownload[];

  // Track if any download is in progress
  isDownloading: boolean;

  // Error state
  error: string | null;

  // Actions
  setLanguagePackProgress: (id: string, progress: DownloadProgress, name: string) => void;
  setModelProgress: (id: string, progress: DownloadProgress, modelName: string) => void;
  removeDownload: (id: string) => void;
  setError: (error: string | null) => void;
  clearAllDownloads: () => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  activeDownloads: [],
  isDownloading: false,
  error: null,

  setLanguagePackProgress: (id, progress, name) =>
    set((state) => {
      const existing = state.activeDownloads.findIndex(d => d.id === id);
      const download: ActiveDownload = {
        id,
        type: 'language-pack',
        progress,
        name
      };

      const newDownloads = existing >= 0
        ? state.activeDownloads.map((d, i) => i === existing ? download : d)
        : [...state.activeDownloads, download];

      return {
        activeDownloads: newDownloads,
        isDownloading: true,
        error: null
      };
    }),

  setModelProgress: (id, progress, modelName) =>
    set((state) => {
      const existing = state.activeDownloads.findIndex(d => d.id === id);
      const download: ActiveDownload = {
        id,
        type: 'whisper-model',
        progress: { ...progress, modelName },
        name: `Whisper ${modelName.charAt(0).toUpperCase() + modelName.slice(1)} Model`
      };

      const newDownloads = existing >= 0
        ? state.activeDownloads.map((d, i) => i === existing ? download : d)
        : [...state.activeDownloads, download];

      return {
        activeDownloads: newDownloads,
        isDownloading: true,
        error: null
      };
    }),

  removeDownload: (id) =>
    set((state) => {
      const newDownloads = state.activeDownloads.filter(d => d.id !== id);
      return {
        activeDownloads: newDownloads,
        isDownloading: newDownloads.length > 0
      };
    }),

  setError: (error) =>
    set({ error, isDownloading: false }),

  clearAllDownloads: () =>
    set({ activeDownloads: [], isDownloading: false, error: null }),
}));
