/**
 * Global download toast
 * Persists across pages for both language packs and Whisper models
 */

import { useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useDownloadStore } from '@/stores/downloadStore';

interface LanguagePackProgressEvent {
  fileType: string;
  languagePair: string;
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  speedMbps: number;
}

interface ModelProgressEvent {
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
  };
  return names[code] || code;
}

function formatLanguagePackName(event: LanguagePackProgressEvent): string {
  if (event.fileType === 'lemmas') {
    return `${getLanguageName(event.languagePair)} lemmas`;
  } else {
    const [from, to] = event.languagePair.split('-');
    return `${getLanguageName(from)}-${getLanguageName(to)} translations`;
  }
}

export function GlobalDownloadToast() {
  const { activeDownload, isDownloading, error, setLanguagePackProgress, setModelProgress, clearDownload } = useDownloadStore();

  // Listen to language pack download progress
  useEffect(() => {
    const unlistenPromise = listen<LanguagePackProgressEvent>('download_progress', (event) => {
      const name = formatLanguagePackName(event.payload);
      setLanguagePackProgress({
        downloadedBytes: event.payload.downloadedBytes,
        totalBytes: event.payload.totalBytes,
        percentage: event.payload.percentage,
        speedMbps: event.payload.speedMbps,
        fileType: event.payload.fileType,
        languagePair: event.payload.languagePair,
      }, name);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [setLanguagePackProgress]);

  // Listen to model download progress
  useEffect(() => {
    const unlistenPromise = listen<ModelProgressEvent>('model-download-progress', (event) => {
      // Extract model name from current download or use a default
      const modelName = activeDownload?.progress.modelName || 'model';
      setModelProgress({
        downloadedBytes: event.payload.downloadedBytes,
        totalBytes: event.payload.totalBytes,
        percentage: event.payload.percentage,
      }, modelName);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [setModelProgress, activeDownload]);

  // Auto-hide when complete
  useEffect(() => {
    if (activeDownload && activeDownload.progress.percentage >= 100) {
      const timer = setTimeout(() => {
        clearDownload();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeDownload, clearDownload]);

  if (!isDownloading && !error) {
    return null;
  }

  const progress = activeDownload?.progress.percentage || 0;
  const isComplete = progress >= 100;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[400px] max-w-[500px]">
        <div className="flex items-start gap-3">
          {/* Download Icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 flex-shrink-0 mt-0.5">
            <Download className={`w-4 h-4 text-blue-600 ${isComplete ? '' : 'animate-pulse'}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-medium text-sm text-gray-900 truncate">
                {error ? 'Download failed' : isComplete ? 'Download complete' : `Downloading ${activeDownload?.name || 'file'}`}
              </h3>
              <button
                onClick={clearDownload}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-xs text-red-600 mb-2">{error}</p>
            )}

            {/* Download Name */}
            {activeDownload && !error && (
              <p className="text-xs text-gray-600 mb-3">
                {activeDownload.name}
              </p>
            )}

            {/* Progress Bar */}
            {activeDownload && !error && (
              <>
                <div className="relative h-1.5 bg-gray-200 rounded-full mb-2">
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                  <span>{Math.round(progress)}%</span>
                  <span>
                    {formatBytes(activeDownload.progress.downloadedBytes)} / {formatBytes(activeDownload.progress.totalBytes)}
                  </span>
                  {activeDownload.progress.speedMbps && activeDownload.progress.speedMbps > 0 && !isComplete && (
                    <span className="text-blue-600">
                      {activeDownload.progress.speedMbps.toFixed(1)} MB/s
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Success Message */}
            {isComplete && !error && (
              <p className="text-xs text-green-600 font-medium">
                Ready to use!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
