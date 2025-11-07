import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAutoDownload } from '@/hooks/language-packs'
import { SettingsSidebar, type SettingsSection } from '@/components/settings/SettingsSidebar'
import { GeneralSettingsSection } from '@/components/settings/GeneralSettingsSection'
import { AudioSettingsSection } from '@/components/settings/AudioSettingsSection'
import { LanguageSettingsSection } from '@/components/settings/LanguageSettingsSection'
import { PrivacySettingsSection } from '@/components/settings/PrivacySettingsSection'
import { DeveloperSettingsSection } from '@/components/settings/DeveloperSettingsSection'
import { AboutSettingsSection } from '@/components/settings/AboutSettingsSection'

export function Settings() {
  const { settings } = useSettingsStore()
  const [showSaved, setShowSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  // Auto-download language packs when languages change
  // Progress shown in global download toast
  useAutoDownload({
    primaryLanguage: settings.primaryLanguage,
    targetLanguage: settings.targetLanguage,
    enabled: true,
  })

  // Show "Saved" indicator when settings change
  useEffect(() => {
    setShowSaved(true)
    const timer = setTimeout(() => setShowSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [settings])

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-4xl">
          {/* Auto-save indicator */}
          <div className="flex items-center justify-end mb-6">
            {showSaved && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-sm font-medium animate-in fade-in duration-200">
                <Check className="w-4 h-4" />
                Saved
              </div>
            )}
          </div>

          {/* Section Content with fade transition */}
          <div className="animate-in fade-in duration-300">
            {activeSection === 'general' && <GeneralSettingsSection />}
            {activeSection === 'audio' && <AudioSettingsSection />}
            {activeSection === 'language' && <LanguageSettingsSection />}
            {activeSection === 'privacy' && <PrivacySettingsSection />}
            {activeSection === 'developer' && <DeveloperSettingsSection />}
            {activeSection === 'about' && <AboutSettingsSection />}
          </div>
        </div>
      </div>
    </div>
  )
}
