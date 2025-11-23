import { Card } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settingsStore'
import { LanguagePackSection } from './LanguagePackSection'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'

export function LanguageSettingsSection() {
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Language Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Target Language
            </label>
            <select
              className="w-full max-w-md p-3 border border-border rounded-lg bg-input text-foreground transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={settings.targetLanguage}
              onChange={(e) => updateSetting('targetLanguage', e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground mt-2">
              The language you're learning or practicing
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Primary Language
            </label>
            <select
              className="w-full max-w-md p-3 border border-border rounded-lg bg-input text-foreground transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={settings.primaryLanguage}
              onChange={(e) => updateSetting('primaryLanguage', e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground mt-2">
              Your native language - vocabulary translations will be shown in this language
            </p>
          </div>
        </div>
      </Card>

      {/* Language Pack Status */}
      <LanguagePackSection />
    </div>
  )
}
