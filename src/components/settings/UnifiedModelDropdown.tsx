import { useSettings } from '@/hooks/settings'
import { useInstalledModels } from '@/hooks/models'
import { Card } from '@/components/ui/card'
import { toast } from '@/lib/toast'

interface LocalModel {
  id: string
  name: string
  size: string
  description: string
}

const LOCAL_MODELS: LocalModel[] = [
  { id: 'tiny', name: 'Tiny', size: '75 MB', description: 'Fastest, lowest accuracy' },
  { id: 'base', name: 'Base', size: '142 MB', description: 'Good balance (recommended)' },
  { id: 'small', name: 'Small', size: '466 MB', description: 'Better accuracy' },
  { id: 'medium', name: 'Medium', size: '1.5 GB', description: 'High accuracy' },
  { id: 'large', name: 'Large', size: '2.9 GB', description: 'Highest accuracy, slower' },
  { id: 'large-v2', name: 'Large-v2', size: '2.9 GB', description: 'Improved large model' },
  { id: 'large-v3', name: 'Large-v3', size: '2.9 GB', description: 'Best accuracy available' },
]

export function UnifiedModelDropdown() {
  const { settings, updateSetting } = useSettings()
  const { data: installedModels } = useInstalledModels()

  const handleModelChange = (modelId: string) => {
    // Check if it's installed
    const isInstalled = installedModels?.some(m => m.name === modelId)
    if (!isInstalled) {
      toast.info('Please download this model first in the Whisper Model section below')
      return
    }

    updateSetting('selectedModel', modelId)
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Transcription Model</h2>

      <div className="space-y-4">
        {/* Model Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Model</label>
          <select
            value={settings.selectedModel}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full max-w-md p-3 border border-border rounded-lg bg-input text-foreground"
          >
            {!settings.selectedModel && (
              <option value="">Select a model...</option>
            )}

            <optgroup label="Local Models (Installed)">
              {LOCAL_MODELS
                .filter(model => {
                  // Only show installed models
                  const isInstalled = installedModels?.some(m => m.name === model.id)
                  return isInstalled
                })
                .map(model => (
                  <option
                    key={model.id}
                    value={model.id}
                  >
                    {model.name} ({model.size}) ✓
                  </option>
                ))
              }
            </optgroup>
          </select>
        </div>

        {/* Model Info */}
        {settings.selectedModel && (
          <div className="p-3 bg-muted rounded-lg border border-border">
            <LocalModelInfo modelId={settings.selectedModel} />
          </div>
        )}
      </div>
    </Card>
  )
}

function LocalModelInfo({ modelId }: { modelId: string }) {
  const model = LOCAL_MODELS.find(m => m.id === modelId)
  if (!model) return null

  return (
    <div>
      <p className="text-sm font-semibold mb-1">💻 Local Model: {model.name}</p>
      <p className="text-xs text-gray-600">{model.description}</p>
      <p className="text-xs text-gray-500 mt-1">
        Size: {model.size} • Processing: On your device • Privacy: No data sent to cloud
      </p>
    </div>
  )
}
