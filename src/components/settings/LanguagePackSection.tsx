/**
 * Language Pack Status Section for Settings Page
 * Shows all supported languages with download status and actions
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useSettingsStore } from '@/stores/settingsStore';
import { useInstalledLanguages } from '@/hooks/language-packs';
import { useDownloadStore } from '@/stores/downloadStore';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { Check, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
];

export function LanguagePackSection() {
  const { settings } = useSettingsStore();
  const queryClient = useQueryClient();
  const { activeDownload } = useDownloadStore();
  const { data: installedLanguages, isLoading } = useInstalledLanguages();
  const [deletingLang, setDeletingLang] = useState<string | null>(null);

  const handleDownload = async (langCode: string) => {
    try {
      toast.info(`Downloading ${langCode.toUpperCase()} lemmas...`);

      // Fetch manifest to get download URL
      const manifestUrl = window.location.origin + '/language-packs.json';
      const response = await fetch(manifestUrl);
      const manifest = await response.json();

      const langInfo = manifest.languages[langCode];
      if (!langInfo || !langInfo.lemmas_url) {
        throw new Error(`No download URL found for ${langCode}`);
      }

      await invoke('download_lemmas', {
        lang: langCode,
        url: langInfo.lemmas_url
      });

      toast.success(`${langCode.toUpperCase()} lemmas downloaded!`);
      queryClient.invalidateQueries({ queryKey: ['installedLanguages'] });
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Failed to download: ${error}`);
    }
  };

  const handleDelete = async (langCode: string) => {
    try {
      setDeletingLang(langCode);
      await invoke('delete_language_pack', { lang: langCode });
      toast.success(`${langCode.toUpperCase()} lemmas deleted`);
      queryClient.invalidateQueries({ queryKey: ['installedLanguages'] });
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(`Failed to delete: ${error}`);
    } finally {
      setDeletingLang(null);
    }
  };

  const isInstalled = (langCode: string) => {
    return installedLanguages?.includes(langCode) || false;
  };

  const isCurrentlyUsed = (langCode: string) => {
    return langCode === settings.targetLanguage || langCode === settings.primaryLanguage;
  };

  const isDownloading = (langCode: string) => {
    if (activeDownload?.type !== 'language-pack') return false;
    const langPair = activeDownload.progress.languagePair;
    return langPair === langCode;
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Language Packs</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage lemmatization databases for vocabulary tracking
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading language packs...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const installed = isInstalled(lang.code);
            const inUse = isCurrentlyUsed(lang.code);
            const downloading = isDownloading(lang.code);
            const deleting = deletingLang === lang.code;

            return (
              <div
                key={lang.code}
                className="flex items-center justify-between p-3 rounded border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  {downloading ? (
                    <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : installed ? (
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Download className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}

                  {/* Language Info */}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {lang.name}
                      {inUse && (
                        <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                          (In use)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {downloading
                        ? `Downloading... ${Math.round(activeDownload!.progress.percentage)}%`
                        : installed
                        ? 'Lemmas installed'
                        : 'Not installed'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!installed && !downloading && (
                    <button
                      onClick={() => handleDownload(lang.code)}
                      className="px-2.5 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  )}

                  {installed && !inUse && (
                    <button
                      onClick={() => handleDelete(lang.code)}
                      disabled={deleting}
                      className="px-2.5 py-1 text-xs bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Delete
                    </button>
                  )}

                  {installed && inUse && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 px-2.5 py-1">
                      Currently in use
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
