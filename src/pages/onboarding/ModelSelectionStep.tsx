import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/subscription'
import { useAuth } from '@/hooks/auth'
import { useInstalledModels, useAvailableModels } from '@/hooks/models'
import { Check } from 'lucide-react'

interface ModelSelectionStepProps {
  selectedModel: string
  onModelChange: (model: string) => void
  onContinue: () => void
  onSignIn: () => void
  showAuthSuccess: boolean
}

export function ModelSelectionStep(props: ModelSelectionStepProps) {
  const { data: subscription } = useSubscription()
  const { user, signOut } = useAuth()
  const { data: installedModels } = useInstalledModels()
  const { data: availableModels } = useAvailableModels()

  const freeModels = availableModels?.filter(m => !m.premiumRequired) || []
  const premiumModels = availableModels?.filter(m => m.premiumRequired) || []

  return (
    <div className="min-h-screen flex items-center justify-center p-8 pb-32 bg-background">
      {/* User Profile - Top Right */}
      {user && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-full shadow-sm">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{user.email}</p>
            <p className="text-xs text-gray-500">
              {subscription?.isPremium ? 'Premium' : 'Free'}
            </p>
          </div>
          <Button
            onClick={() => signOut()}
            variant="ghost"
            size="sm"
            className="h-8 rounded-full"
          >
            Sign Out
          </Button>
        </div>
      )}

      {/* Success Message */}
      {props.showAuthSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">Successfully signed in!</p>
              <p className="text-sm text-green-700">
                {subscription?.isPremium ? 'Premium features unlocked ✨' : 'Welcome back!'}
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="max-w-2xl w-full p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Transcription Model</h1>
          <p className="text-gray-600">Select how you want to transcribe your speech</p>
        </div>

        <div className="space-y-4">
          {/* Free Models */}
          <div>
            <h3 className="font-semibold mb-3">Free Models</h3>
            <div className="space-y-1.5">
              {freeModels.map(model => {
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

          {/* Premium Models */}
          <div>
            <h3 className="font-semibold mb-3">Premium Models</h3>

            {/* Cloud Model */}
            <label
              className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all duration-300 mb-1.5 ${
                props.selectedModel === 'openai-whisper'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!subscription?.isPremium ? 'opacity-60' : 'opacity-100'}`}
            >
              <input
                type="radio"
                name="model"
                value="openai-whisper"
                checked={props.selectedModel === 'openai-whisper'}
                onChange={(e) => props.onModelChange(e.target.value)}
                disabled={!subscription?.isPremium}
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">☁️ OpenAI Whisper Cloud</span>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                    🔒 Premium
                  </span>
                  {subscription?.isPremium && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                      ⭐ Recommended for you
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Best accuracy, all languages, unlimited usage
                </p>
              </div>
            </label>

            {/* Large Models */}
            {premiumModels.map(model => (
              <label
                key={model.name}
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all duration-300 mb-1.5 ${
                  props.selectedModel === model.name
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!subscription?.isPremium ? 'opacity-60' : 'opacity-100'}`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.name}
                  checked={props.selectedModel === model.name}
                  onChange={(e) => props.onModelChange(e.target.value)}
                  disabled={!subscription?.isPremium}
                  className="mt-1"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.displayName}</span>
                    <span className="text-xs text-gray-500">({model.sizeMb} MB)</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                      🔒 Premium
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-4 left-0 right-0 z-50 px-8">
        <div className="max-w-2xl mx-auto">
          <div className="border border-gray-200/50 rounded-xl bg-white/60 backdrop-blur-md p-4 shadow-lg">
            <div className="flex gap-3">
              {!user && (
                <Button
                  onClick={props.onSignIn}
                  variant="outline"
                  className="flex-1"
                >
                  Sign In
                </Button>
              )}
              <Button
                onClick={props.onContinue}
                disabled={!props.selectedModel}
                className="flex-1"
              >
                {user ? 'Continue' : 'Continue as Guest'}
              </Button>
            </div>

            {!subscription?.isPremium && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Premium models require a subscription. Sign in or upgrade to access.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
