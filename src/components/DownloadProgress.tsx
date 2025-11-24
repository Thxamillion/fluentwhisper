/**
 * Unified Download Progress Component
 * Single source of truth - displays progress from downloadStore
 * Works for both Whisper models and language packs
 * Supports multiple concurrent downloads
 */

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDownloadStore, ActiveDownload } from '@/stores/downloadStore';
import { CheckCircle } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface SingleDownloadProgressProps {
  download: ActiveDownload;
  isDownloading: boolean;
}

function SingleDownloadProgress({ download, isDownloading }: SingleDownloadProgressProps) {
  const progress = download.progress.percentage || 0;
  const isComplete = progress >= 100 && !isDownloading;

  return (
    <div className="space-y-2">
      {/* Title and Percentage */}
      <div className="flex items-center justify-between">
        <div className="font-medium flex items-center gap-2">
          {isComplete && <CheckCircle className="w-4 h-4 text-green-600" />}
          {download.name}
        </div>
        <div className="text-sm text-gray-500">{Math.round(progress)}%</div>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-2" />

      {/* Download Details */}
      {isDownloading && !isComplete && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          {/* Type-specific details */}
          <div>
            {download.type === 'language-pack' && download.progress.fileType && (
              <span>
                {download.progress.fileType === 'lemmas' ? 'Lemmas' : 'Translations'}: {download.progress.languagePair}
              </span>
            )}
          </div>

          {/* Bytes and Speed */}
          <div className="font-mono">
            {formatBytes(download.progress.downloadedBytes)} / {formatBytes(download.progress.totalBytes)}
            {download.progress.speedMbps && download.progress.speedMbps > 0 && (
              <span className="ml-2">
                ({download.progress.speedMbps.toFixed(1)} MB/s)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Completion Message */}
      {isComplete && (
        <div className="text-sm text-green-600">
          {download.type === 'whisper-model'
            ? 'Model is ready to use!'
            : 'Language pack is ready to use!'
          }
        </div>
      )}
    </div>
  );
}

export function DownloadProgress() {
  const { activeDownloads, isDownloading, error } = useDownloadStore();

  // Error state
  if (error) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <div className="text-red-600 font-semibold">Download failed</div>
        </div>
        <p className="text-sm text-red-700 mt-2">{error}</p>
        <p className="text-xs text-red-600 mt-2">
          Please check your internet connection and try again.
        </p>
      </Card>
    );
  }

  // No active downloads
  if (activeDownloads.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {activeDownloads.map((download) => (
          <SingleDownloadProgress
            key={download.id}
            download={download}
            isDownloading={isDownloading}
          />
        ))}
      </div>
    </Card>
  );
}
