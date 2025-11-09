import { Card } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settingsStore'
import { LanguagePackSection } from './LanguagePackSection'

const languageOptions = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
]

export function LanguageSettingsSection() {
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="space-y-6">
      {/* Language Pack Status */}
      <LanguagePackSection />

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
              {languageOptions.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
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
              {languageOptions.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground mt-2">
              Your native language - vocabulary translations will be shown in this language
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
