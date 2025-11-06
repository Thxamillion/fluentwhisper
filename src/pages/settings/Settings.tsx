import { WhisperModelSection } from '../../components/settings/WhisperModelSection';
import { UnifiedModelDropdown } from '../../components/settings/UnifiedModelDropdown';
import { LanguagePackSection } from '../../components/settings/LanguagePackSection';
import { Card } from '@/components/ui/card';
import { useSettingsStore } from '@/stores/settingsStore';
import { useState, useEffect } from 'react';
import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { useAutoDownload } from '@/hooks/language-packs';
import { useTheme } from 'next-themes';

export function Settings() {
  const { settings, updateSetting } = useSettingsStore();
  const [showSaved, setShowSaved] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch - only render theme selector after mount
  useEffect(() => {
    setMounted(true);
  }, []);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Changes are saved automatically</p>
        </div>
        {showSaved && (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium animate-in fade-in duration-200">
            <Check className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      <div className="space-y-8">
        {/* Appearance Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3">Theme</label>
              {mounted ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                      theme === 'light'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                      theme === 'dark'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`flex-1 flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                      theme === 'system'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="font-medium">System</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  {/* Loading skeleton */}
                  <div className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  <div className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                  <div className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Choose your preferred theme. System will match your device settings.
              </p>
            </div>
          </div>
        </Card>

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
                className="w-full max-w-md p-3 border border-border rounded-lg bg-input text-foreground"
                value={settings.targetLanguage}
                onChange={(e) => updateSetting('targetLanguage', e.target.value)}
              >
                {languageOptions.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                This is the language Whisper will transcribe and the language you'll practice speaking.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Primary Language (your native language - for translations)
              </label>
              <select
                className="w-full max-w-md p-3 border border-border rounded-lg bg-input text-foreground"
                value={settings.primaryLanguage}
                onChange={(e) => updateSetting('primaryLanguage', e.target.value)}
              >
                {languageOptions.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
                className="w-full max-w-md p-3 border border-border rounded-lg bg-input text-foreground"
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Automatically delete old sessions and audio files.
                Cleanup runs when you start the app.
              </p>
            </div>
            {settings.retentionDays && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                  <strong>Warning:</strong> Sessions older than {settings.retentionDays} days will be permanently deleted.
                  This cannot be undone.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Developer Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Developer</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Debug Mode</label>
                <p className="text-xs text-muted-foreground mt-1">
                  Show detailed logging in the console for troubleshooting
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.debugMode}
                  onChange={(e) => updateSetting('debugMode', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}