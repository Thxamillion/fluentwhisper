import { Card } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settingsStore'
import { AlertTriangle } from 'lucide-react'

export function PrivacySettingsSection() {
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Privacy</h2>
        <p className="text-sm text-muted-foreground">Manage your data and privacy settings</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Data Retention</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Automatically delete old data</label>
            <select
              className="w-full max-w-md p-3 border border-border rounded-lg bg-input text-foreground transition-colors hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={settings.retentionDays ?? 'never'}
              onChange={(e) => {
                const value = e.target.value === 'never' ? null : parseInt(e.target.value)
                updateSetting('retentionDays', value)
              }}
            >
              <option value="never">Never delete (keep forever)</option>
              <option value="30">Delete after 30 days</option>
              <option value="60">Delete after 60 days</option>
              <option value="90">Delete after 90 days</option>
            </select>
            <p className="text-sm text-muted-foreground mt-2">
              Automatically delete old sessions and audio files. Cleanup runs when you start the app.
            </p>
          </div>

          {settings.retentionDays && (
            <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Automatic deletion enabled
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  Sessions older than {settings.retentionDays} days will be permanently deleted. This cannot be undone.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Analytics</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="analytics-toggle"
              checked={settings.analyticsEnabled}
              onChange={(e) => updateSetting('analyticsEnabled', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="analytics-toggle" className="text-sm font-medium cursor-pointer">
                Share anonymous usage data
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Help improve FluentWhisper by sharing anonymous analytics. We collect feature usage, error reports, and performance metrics.
                We <strong>never</strong> collect your voice recordings, transcriptions, vocabulary words, or personal information.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
