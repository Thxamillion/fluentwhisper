import { Card } from '@/components/ui/card'
import { useSettingsStore } from '@/stores/settingsStore'
import { Filter } from 'lucide-react'

export function TranscriptionSettingsSection() {
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Hallucination Filtering</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Remove common Whisper AI hallucinations from transcripts. Based on research into typical Whisper output errors.
        </p>

        <div className="space-y-4">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
            <div>
              <label className="text-sm font-medium">Enable Hallucination Filtering</label>
              <p className="text-xs text-muted-foreground mt-1">
                Remove known hallucinated phrases from transcripts
              </p>
            </div>
            <button
              onClick={() => updateSetting('hallucinationFilterEnabled', !settings.hallucinationFilterEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.hallucinationFilterEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.hallucinationFilterEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Category Filters */}
          {settings.hallucinationFilterEnabled && (
            <div className="space-y-3 pl-4 border-l-2 border-border">
              {/* YouTube/Social Media */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">YouTube Phrases</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    "Thank you for watching", "Please subscribe", etc.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.filterYoutubeHallucinations}
                  onChange={(e) => updateSetting('filterYoutubeHallucinations', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>

              {/* Music/Sound Markers */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Music & Sound Markers</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    "[MUSIC]", "♪", "[APPLAUSE]", "[BLANK_AUDIO]"
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.filterMarkerHallucinations}
                  onChange={(e) => updateSetting('filterMarkerHallucinations', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>

              {/* Subtitle Credits */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Subtitle Credits</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    "Subtitles by...", "Transcribed by...", Amara.org credits
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.filterCreditHallucinations}
                  onChange={(e) => updateSetting('filterCreditHallucinations', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>

              {/* Repetition */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Repetitive Loops</label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Remove same sentence repeated {settings.repetitionThreshold}+ times
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.filterRepetitionHallucinations}
                  onChange={(e) => updateSetting('filterRepetitionHallucinations', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>

              {/* Repetition Threshold */}
              {settings.filterRepetitionHallucinations && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <label className="block text-sm font-medium mb-2">
                    Repetition Threshold: {settings.repetitionThreshold}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="5"
                    value={settings.repetitionThreshold}
                    onChange={(e) => updateSetting('repetitionThreshold', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    A sentence must repeat at least {settings.repetitionThreshold} times consecutively to be filtered
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Note:</strong> These filters are based on academic research identifying common Whisper AI hallucinations.
          They remove phrases the model commonly generates in silence or low-quality audio, particularly from its YouTube training data.
        </p>
      </Card>
    </div>
  )
}
