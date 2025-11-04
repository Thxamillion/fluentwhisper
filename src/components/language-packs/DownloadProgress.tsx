/**
 * Download progress UI component
 * Shows download progress for language packs with speed and percentage
 */

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DownloadProgressProps {
  isDownloading: boolean;
  progress: number; // 0-100
  details?: {
    file_type: string;
    language_pair: string;
    downloaded_bytes: number;
    total_bytes: number;
    speed_mbps: number;
  } | null;
  error?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function DownloadProgress({
  isDownloading,
  progress,
  details,
  error,
}: DownloadProgressProps) {
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

  if (!isDownloading && progress === 0) {
    return null;
  }

  const isComplete = progress >= 100 && !isDownloading;

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">
            {isComplete ? 'Download complete' : 'Downloading language packs'}
          </div>
          <div className="text-sm text-gray-500">{Math.round(progress)}%</div>
        </div>

        <Progress value={progress} className="h-2" />

        {details && isDownloading && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>
              {details.file_type === 'lemmas' ? 'Lemmas' : 'Translations'}: {details.language_pair}
            </div>
            <div>
              {formatBytes(details.downloaded_bytes)} / {formatBytes(details.total_bytes)}
              {details.speed_mbps > 0 && (
                <span className="ml-2">
                  ({details.speed_mbps.toFixed(1)} MB/s)
                </span>
              )}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="text-sm text-green-600">
            Language packs are ready to use!
          </div>
        )}
      </div>
    </Card>
  );
}
