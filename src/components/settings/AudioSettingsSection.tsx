import { UnifiedModelDropdown } from './UnifiedModelDropdown'
import { WhisperModelSection } from './WhisperModelSection'

export function AudioSettingsSection() {
  return (
    <div className="space-y-6">
      {/* Unified Model Selection */}
      <UnifiedModelDropdown />

      {/* Whisper Model Download Section */}
      <WhisperModelSection />
    </div>
  )
}
