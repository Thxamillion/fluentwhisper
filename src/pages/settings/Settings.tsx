import { WhisperModelSection } from '../../components/settings/WhisperModelSection';
import { UnifiedModelDropdown } from '../../components/settings/UnifiedModelDropdown';
import { Card } from '@/components/ui/card';

export function Settings() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="space-y-8">
        {/* Unified Model Selection */}
        <UnifiedModelDropdown />

        {/* Whisper Model Download Section */}
        <WhisperModelSection />

        {/* Audio Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Audio Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Default Microphone</label>
              <select className="w-full max-w-md p-3 border border-gray-300 rounded-lg">
                <option>MacBook Air Microphone</option>
                <option>External Microphone</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Audio Quality</label>
              <select className="w-full max-w-md p-3 border border-gray-300 rounded-lg">
                <option>High (48kHz)</option>
                <option>Medium (44kHz)</option>
                <option>Low (22kHz)</option>
              </select>
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="noiseReduction" className="rounded" />
              <label htmlFor="noiseReduction" className="ml-2 text-sm">
                Enable noise reduction
              </label>
            </div>
          </div>
        </Card>

        {/* Language Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Language Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Primary Language</label>
              <select className="w-full max-w-md p-3 border border-gray-300 rounded-lg">
                <option>English (US)</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target Languages</label>
              <div className="flex flex-wrap gap-2">
                {['Spanish', 'French', 'German', 'Italian'].map((lang) => (
                  <span
                    key={lang}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {lang} ×
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Privacy Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Privacy & Data</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Local Processing</h3>
                <p className="text-sm text-gray-600">All transcription happens on your device</p>
              </div>
              <input type="checkbox" checked disabled className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Auto-delete old recordings</h3>
                <p className="text-sm text-gray-600">Automatically remove recordings after 30 days</p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data retention period</label>
              <select className="w-full max-w-md p-3 border border-gray-300 rounded-lg">
                <option>30 days</option>
                <option>60 days</option>
                <option>90 days</option>
                <option>Never delete</option>
              </select>
            </div>
          </div>
        </Card>

        {/* App Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">App Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Start on system boot</h3>
                <p className="text-sm text-gray-600">Launch Fluent when your computer starts</p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Minimize to system tray</h3>
                <p className="text-sm text-gray-600">Keep app running in background</p>
              </div>
              <input type="checkbox" className="rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select className="w-full max-w-md p-3 border border-gray-300 rounded-lg">
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}