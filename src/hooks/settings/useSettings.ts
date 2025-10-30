import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Hook to access and update app settings
 *
 * @example
 * const { settings, updateSetting } = useSettings()
 *
 * // Read setting
 * const useCloud = settings.useCloudTranscription
 *
 * // Update setting
 * updateSetting('useCloudTranscription', true)
 */
export function useSettings() {
  const settings = useSettingsStore((state) => state.settings)
  const updateSetting = useSettingsStore((state) => state.updateSetting)
  const resetSettings = useSettingsStore((state) => state.resetSettings)

  return {
    settings,
    updateSetting,
    resetSettings,
  }
}
