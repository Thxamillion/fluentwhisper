import { Card } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settingsStore'

export function DeveloperSettingsSection() {
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Developer</h2>
        <p className="text-sm text-muted-foreground">Advanced settings for troubleshooting and debugging</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Debug Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium">Debug Mode</label>
              <p className="text-xs text-muted-foreground mt-1">
                Show detailed logging in the console for troubleshooting
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.debugMode}
                onChange={(e) => updateSetting('debugMode', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </Card>
    </div>
  )
}
