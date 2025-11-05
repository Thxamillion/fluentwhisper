/**
 * Language Pack Status Section for Settings Page
 * Shows what packs are installed/missing and download status
 */

import { Card } from '@/components/ui/card';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLanguagePackStatus } from '@/hooks/language-packs';
import { useDownloadStore } from '@/stores/downloadStore';
import { Check, Download, Loader2 } from 'lucide-react';

export function LanguagePackSection() {
  const { settings } = useSettingsStore();
  const { activeDownload } = useDownloadStore();

  const { data: packStatus, isLoading } = useLanguagePackStatus({
    primaryLanguage: settings.primaryLanguage,
    targetLanguage: settings.targetLanguage,
  });

  const isDownloading = activeDownload?.type === 'language-pack';
  const downloadProgress = isDownloading ? activeDownload.progress.percentage : 0;

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
    };
    return names[code] || code;
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Language Packs</h2>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking installed packs...</span>
        </div>
      ) : packStatus?.isMissing ? (
        <div className="space-y-4">
          {/* Download in Progress */}
          {isDownloading ? (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-5 h-5 text-blue-600 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Downloading language packs... {Math.round(downloadProgress)}%
                  </p>
                  <p className="text-xs text-blue-700">
                    {activeDownload?.name}
                  </p>
                </div>
              </div>
              <div className="relative h-2 bg-blue-200 rounded-full">
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${Math.min(downloadProgress, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            /* Missing Packs Info */
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-900">
                  Language packs required
                </p>
              </div>
              <div className="text-xs text-yellow-700 space-y-1">
                {packStatus.missingLemmas.length > 0 && (
                  <p>
                    • Missing lemmatization: {packStatus.missingLemmas.map(getLanguageName).join(', ')}
                  </p>
                )}
                {packStatus.missingTranslations.length > 0 && (
                  <p>
                    • Missing translations: {packStatus.missingTranslations.length} database(s)
                  </p>
                )}
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                Download will start automatically
              </p>
            </div>
          )}

          {/* Current Language Config */}
          <div className="text-sm text-gray-600">
            <p>
              <strong>Learning:</strong> {getLanguageName(settings.targetLanguage)}
            </p>
            <p>
              <strong>Native:</strong> {getLanguageName(settings.primaryLanguage)}
            </p>
          </div>
        </div>
      ) : (
        /* All Packs Installed */
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">
                All language packs installed
              </p>
              <p className="text-xs text-green-700">
                {getLanguageName(settings.targetLanguage)} ↔ {getLanguageName(settings.primaryLanguage)}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        Language packs are downloaded automatically when you change languages. They include lemmatization databases and translation dictionaries.
      </p>
    </Card>
  );
}
