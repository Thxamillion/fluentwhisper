import { useSettings } from '@/hooks/settings'
import { useSubscription } from '@/hooks/subscription'
import { useInstalledModels } from '@/hooks/models'
import { isCloudModel } from '@/stores/settingsStore'
import { Card } from '@/components/ui/card'
import { toast } from '@/lib/toast'

interface LocalModel {
  id: string
  name: string
  size: string
  description: string
  premiumRequired: boolean
}

interface CloudModel {
  id: string
  name: string
  description: string
  premium: boolean
}

const LOCAL_MODELS: LocalModel[] = [
  { id: 'tiny', name: 'Tiny', size: '75 MB', description: 'Fastest, lowest accuracy', premiumRequired: false },
  { id: 'base', name: 'Base', size: '142 MB', description: 'Good balance (recommended)', premiumRequired: false },
  { id: 'small', name: 'Small', size: '466 MB', description: 'Better accuracy', premiumRequired: false },
  { id: 'medium', name: 'Medium', size: '1.5 GB', description: 'High accuracy', premiumRequired: false },
  { id: 'large', name: 'Large', size: '2.9 GB', description: 'Highest accuracy', premiumRequired: true },
  { id: 'large-v2', name: 'Large-v2', size: '2.9 GB', description: 'Improved version', premiumRequired: true },
  { id: 'large-v3', name: 'Large-v3', size: '2.9 GB', description: 'Newest and best', premiumRequired: true },
]

const CLOUD_MODELS: CloudModel[] = [
  {
    id: 'openai-whisper',
    name: 'OpenAI Whisper',
    description: 'Best accuracy, all languages, unlimited (Premium)',
    premium: true
  }
]

export function UnifiedModelDropdown() {
  const { settings, updateSetting } = useSettings()
  const { data: subscription } = useSubscription()
  const { data: installedModels } = useInstalledModels()

  const handleModelChange = (modelId: string) => {
    // Check if cloud model and user is not premium
    if (isCloudModel(modelId) && !subscription?.isPremium) {
      toast.warning('Cloud models require a Premium subscription')
      return
    }

    // Check if local premium model and user is not premium
    if (!isCloudModel(modelId)) {
      const model = LOCAL_MODELS.find(m => m.id === modelId)
      if (model?.premiumRequired && !subscription?.isPremium) {
        toast.warning('This model requires a Premium subscription')
        return
      }

      // Check if it's installed
      const isInstalled = installedModels?.some(m => m.name === modelId)
      if (!isInstalled) {
        toast.info('Please download this model first in the Whisper Model section below')
        return
      }
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
                .map(model => {
                  const isPremiumLocked = model.premiumRequired && !subscription?.isPremium
                  return (
                    <option
                      key={model.id}
                      value={model.id}
                      disabled={isPremiumLocked}
                    >
                      {model.premiumRequired && '🔒 '}{model.name} ({model.size}) {isPremiumLocked ? '(Requires Premium)' : '✓'}
                    </option>
                  )
                })
              }
            </optgroup>

            <optgroup label="Cloud Models (Premium)">
              {CLOUD_MODELS.map(model => (
                <option
                  key={model.id}
                  value={model.id}
                  disabled={!subscription?.isPremium}
                >
                  ☁️ {model.name} {!subscription?.isPremium && '(Requires Premium)'}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Model Info */}
        {settings.selectedModel && (
          <div className="p-3 bg-muted rounded-lg border border-border">
            {isCloudModel(settings.selectedModel) ? (
              <CloudModelInfo modelId={settings.selectedModel} />
            ) : (
              <LocalModelInfo modelId={settings.selectedModel} />
            )}
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

function CloudModelInfo({ modelId }: { modelId: string }) {
  const model = CLOUD_MODELS.find(m => m.id === modelId)
  if (!model) return null

  return (
    <div>
      <p className="text-sm font-semibold mb-1">☁️ Cloud Model: {model.name}</p>
      <p className="text-xs text-gray-600">{model.description}</p>
      <p className="text-xs text-gray-500 mt-1">
        Processing: Cloud-based • Requires: Internet connection • Limit: 180 min/day
      </p>
      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
        ⚠️ Supports recordings up to 25 minutes. For longer sessions, use local models.
      </p>
    </div>
  )
}
