/**
 * Language Pack Banner - Shows when required language packs are missing
 * Similar to FirstRunCheck for Whisper models
 */

import { AlertCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguagePackStatus } from '@/hooks/language-packs';
import { useSettingsStore } from '@/stores/settingsStore';
import { useDownloadStore } from '@/stores/downloadStore';

export function LanguagePackBanner() {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const { activeDownload } = useDownloadStore();

  const { data: packStatus, isLoading } = useLanguagePackStatus({
    primaryLanguage: settings.primaryLanguage,
    targetLanguage: settings.targetLanguage,
  });

  console.log('[LanguagePackBanner] Render check:', {
    isLoading,
    packStatus,
    isMissing: packStatus?.isMissing,
    primaryLang: settings.primaryLanguage,
    targetLang: settings.targetLanguage,
  });

  // Don't show banner if loading, nothing missing, or already downloading
  if (isLoading || !packStatus?.isMissing) {
    return null;
  }

  console.log('[LanguagePackBanner] Banner is visible!');

  const handleGoToSettings = () => {
    console.log('[LanguagePackBanner] Button clicked - navigating to settings');
    navigate('/settings');
  };

  const isDownloading = activeDownload?.type === 'language-pack';
  const downloadProgress = isDownloading ? activeDownload.progress.percentage : 0;

  // Build a friendly message about what's missing
  const getMissingPacksMessage = () => {
    const parts: string[] = [];

    if (packStatus.missingLemmas.length > 0) {
      const langs = packStatus.missingLemmas.map(code => {
        const names: Record<string, string> = {
          'en': 'English',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'it': 'Italian',
        };
        return names[code] || code;
      });
      parts.push(`${langs.join(', ')} lemmatization`);
    }

    if (packStatus.missingTranslations.length > 0) {
      parts.push('translation database');
    }

    return parts.join(' and ');
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {isDownloading
                  ? `Downloading language pack... ${Math.round(downloadProgress)}%`
                  : 'Language Pack Required'
                }
              </p>
              <p className="text-xs text-blue-700">
                {isDownloading
                  ? 'Please wait while we download the required files'
                  : `Download ${getMissingPacksMessage()} to enable full features`
                }
              </p>
            </div>
          </div>
          {!isDownloading && (
            <button
              onClick={handleGoToSettings}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Go to Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
