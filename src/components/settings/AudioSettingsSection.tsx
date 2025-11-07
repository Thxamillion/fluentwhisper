import { UnifiedModelDropdown } from './UnifiedModelDropdown'
import { WhisperModelSection } from './WhisperModelSection'

export function AudioSettingsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Audio</h2>
        <p className="text-sm text-muted-foreground">Configure transcription models and audio settings</p>
      </div>

      {/* Unified Model Selection */}
      <UnifiedModelDropdown />

      {/* Whisper Model Download Section */}
      <WhisperModelSection />
    </div>
  )
}
