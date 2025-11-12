/**
 * Language Pack Download Step
 * Downloads required language packs for the selected language pair
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useEffect } from 'react';
import { useAutoDownload } from '@/hooks/language-packs';
import { DownloadProgress } from '@/components/DownloadProgress';

interface LanguagePackDownloadStepProps {
  primaryLanguage: string;
  learningLanguage: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function LanguagePackDownloadStep({
  primaryLanguage,
  learningLanguage,
  onComplete,
  onSkip,
}: LanguagePackDownloadStepProps) {
  const {
    isDownloading,
    progress,
    error,
    downloadDetails,
    requiredPacks,
  } = useAutoDownload({
    primaryLanguage,
    targetLanguage: learningLanguage,
    enabled: true,
  });

  // Auto-advance when download completes or if nothing to download
  useEffect(() => {
    if (
      !isDownloading &&
      requiredPacks &&
      requiredPacks.lemmas.length === 0 &&
      requiredPacks.translations.length === 0
    ) {
      // Nothing to download, skip this step
      onComplete();
    }
  }, [isDownloading, requiredPacks, onComplete]);

  useEffect(() => {
    if (!isDownloading && progress === 100) {
      // Download complete, wait a moment then continue
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isDownloading, progress, onComplete]);

  // Show nothing if no packs are required (will auto-advance)
  if (
    requiredPacks &&
    requiredPacks.lemmas.length === 0 &&
    requiredPacks.translations.length === 0 &&
    !isDownloading
  ) {
    return null;
  }

  const languageName = learningLanguage === 'es' ? 'Spanish' :
                       learningLanguage === 'fr' ? 'French' :
                       learningLanguage === 'de' ? 'German' :
                       learningLanguage === 'it' ? 'Italian' :
                       learningLanguage;

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Download className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Downloading Language Packs</h1>
          <p className="text-gray-600">
            Setting up vocabulary tracking for {languageName}
          </p>
        </div>

        <div className="space-y-6">
          {/* Unified Download Progress */}
          <DownloadProgress />

          {!isDownloading && progress === 0 && !error && (
            <div className="text-center text-sm text-gray-500">
              Preparing download...
            </div>
          )}

          {error && onSkip && (
            <Button onClick={onSkip} variant="outline" className="w-full">
              Skip for now
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
