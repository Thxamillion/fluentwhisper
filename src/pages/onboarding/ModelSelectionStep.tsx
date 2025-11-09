import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useInstalledModels, useAvailableModels } from '@/hooks/models'

interface ModelSelectionStepProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onContinue: () => void
}

export function ModelSelectionStep(props: ModelSelectionStepProps) {
  const { data: installedModels } = useInstalledModels()
  const { data: availableModels } = useAvailableModels()

  // Filter out premium-only models for OSS release
  const localModels = availableModels?.filter(m => m.type === 'local') || []

  return (
    <div className="min-h-screen flex items-center justify-center p-8 pb-32 bg-background">
      <Card className="max-w-2xl w-full p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Transcription Model</h1>
          <p className="text-gray-600">Select a local Whisper model for privacy-focused transcription</p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-3">Local Models</h3>
            <div className="space-y-1.5">
              {localModels.map(model => {
                const _isInstalled = installedModels?.some(m => m.name === model.name)
                return (
                  <label
                    key={model.name}
                    className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      props.selectedModel === model.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={model.name}
                      checked={props.selectedModel === model.name}
                      onChange={(e) => props.onModelChange(e.target.value)}
                      className="mt-1"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.displayName}</span>
                        <span className="text-xs text-gray-500">({model.sizeMb} MB)</span>
                        {model.name === 'base' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-4 left-0 right-0 z-50 px-8">
        <div className="max-w-2xl mx-auto">
          <div className="border border-gray-200/50 rounded-xl bg-white/60 backdrop-blur-md p-4 shadow-lg">
            <Button
              onClick={props.onContinue}
              disabled={!props.selectedModel}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
