import { WhisperModelSection } from '../../components/settings/WhisperModelSection';
import { UnifiedModelDropdown } from '../../components/settings/UnifiedModelDropdown';
import { LanguagePackSection } from '../../components/settings/LanguagePackSection';
import { Card } from '@/components/ui/card';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useAutoDownload } from '@/hooks/language-packs';

export function Settings() {
  const { settings, updateSetting } = useSettingsStore();
  const [showSaved, setShowSaved] = useState(false);

  // Auto-download language packs when languages change
  // Progress shown in global download toast
  useAutoDownload({
    primaryLanguage: settings.primaryLanguage,
    targetLanguage: settings.targetLanguage,
    enabled: true,
  });

  // Show "Saved" indicator when settings change
  useEffect(() => {
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [settings]);

  // Only languages with available language packs
  const languageOptions = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Auto-save indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Changes are saved automatically</p>
        </div>
        {showSaved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-in fade-in duration-200">
            <Check className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Unified Model Selection */}
        <UnifiedModelDropdown />

        {/* Whisper Model Download Section */}
        <WhisperModelSection />

        {/* Language Pack Status */}
        <LanguagePackSection />

        {/* Language Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Language Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Target Language (the language you're learning/practicing)
              </label>
              <select
                className="w-full max-w-md p-3 border border-gray-300 rounded-lg"
                value={settings.targetLanguage}
                onChange={(e) => updateSetting('targetLanguage', e.target.value)}
              >
                {languageOptions.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 mt-2">
                This is the language Whisper will transcribe and the language you'll practice speaking.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Primary Language (your native language - for translations)
              </label>
              <select
                className="w-full max-w-md p-3 border border-gray-300 rounded-lg"
                value={settings.primaryLanguage}
                onChange={(e) => updateSetting('primaryLanguage', e.target.value)}
              >
                {languageOptions.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 mt-2">
                Vocabulary translations will be shown in this language.
              </p>
            </div>
          </div>
        </Card>

        {/* Privacy & Data */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Privacy & Data</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data retention period</label>
              <select
                className="w-full max-w-md p-3 border border-gray-300 rounded-lg"
                value={settings.retentionDays ?? 'never'}
                onChange={(e) => {
                  const value = e.target.value === 'never' ? null : parseInt(e.target.value);
                  updateSetting('retentionDays', value);
                }}
              >
                <option value="never">Never delete (keep forever)</option>
                <option value="30">Delete after 30 days</option>
                <option value="60">Delete after 60 days</option>
                <option value="90">Delete after 90 days</option>
              </select>
              <p className="text-sm text-gray-600 mt-2">
                Automatically delete old sessions and audio files.
                Cleanup runs when you start the app.
              </p>
            </div>
            {settings.retentionDays && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  <strong>Warning:</strong> Sessions older than {settings.retentionDays} days will be permanently deleted.
                  This cannot be undone.
                </p>
              </div>
            )}
          </div>
        </Card>



      </div>
    </div>
  )
}