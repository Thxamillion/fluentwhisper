/**
 * Hook to automatically download required language packs when user changes languages
 * Monitors primary and target language settings and triggers downloads as needed
 */

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';
import type { RequiredPacks } from '@/types/language-packs';

interface DownloadProgressEvent {
  file_type: string;
  language_pair: string;
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
  speed_mbps: number;
}

interface UseAutoDownloadOptions {
  primaryLanguage: string;
  targetLanguage: string;
  manifestUrl?: string;
  enabled?: boolean; // Allow disabling auto-download
}

interface UseAutoDownloadResult {
  isDownloading: boolean;
  progress: number; // 0-100
  error: string | null;
  downloadDetails: DownloadProgressEvent | null;
  requiredPacks: RequiredPacks | null;
}

const DEFAULT_MANIFEST_URL = '/language-packs.json';

export function useAutoDownload({
  primaryLanguage,
  targetLanguage,
  manifestUrl = DEFAULT_MANIFEST_URL,
  enabled = true,
}: UseAutoDownloadOptions): UseAutoDownloadResult {
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadDetails, setDownloadDetails] = useState<DownloadProgressEvent | null>(null);
  const [requiredPacks, setRequiredPacks] = useState<RequiredPacks | null>(null);

  useEffect(() => {
    if (!enabled || !primaryLanguage || !targetLanguage) {
      return;
    }

    // Listen for download progress events
    const unlistenPromise = listen<DownloadProgressEvent>('download_progress', (event) => {
      setDownloadDetails(event.payload);
      setProgress(event.payload.percentage);
    });

    // Check what packs are needed and download if necessary
    const checkAndDownload = async () => {
      try {
        console.log('[useAutoDownload] Starting check...', { primaryLanguage, targetLanguage });
        setError(null);

        // Get required packs
        const required = await invoke<RequiredPacks>('get_required_packs', {
          primaryLang: primaryLanguage,
          targetLang: targetLanguage,
        });

        console.log('[useAutoDownload] Required packs:', required);
        setRequiredPacks(required);

        // If nothing is needed, we're done
        if (required.lemmas.length === 0 && required.translations.length === 0) {
          console.log('[useAutoDownload] No packs needed, skipping download');
          return;
        }

        // Start downloading
        console.log('[useAutoDownload] Starting download...');
        setIsDownloading(true);
        setProgress(0);

        // Convert manifest URL to absolute URL if needed
        const absoluteManifestUrl = manifestUrl.startsWith('http')
          ? manifestUrl
          : window.location.origin + manifestUrl;

        console.log('[useAutoDownload] Manifest URL:', absoluteManifestUrl);

        await invoke('download_language_pair', {
          primaryLang: primaryLanguage,
          targetLang: targetLanguage,
          manifestUrl: absoluteManifestUrl,
        });

        // Download complete
        console.log('[useAutoDownload] Download complete!');
        setIsDownloading(false);
        setProgress(100);
        setDownloadDetails(null);

        // Invalidate language pack status query to refetch and update UI
        queryClient.invalidateQueries({ queryKey: ['languagePackStatus'] });
        console.log('[useAutoDownload] Invalidated language pack status queries');
      } catch (err) {
        console.error('[useAutoDownload] Language pack download failed:', err);
        setError(err instanceof Error ? err.message : String(err));
        setIsDownloading(false);
      }
    };

    checkAndDownload();

    // Cleanup event listener
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [primaryLanguage, targetLanguage, manifestUrl, enabled]);

  return {
    isDownloading,
    progress,
    error,
    downloadDetails,
    requiredPacks,
  };
}
