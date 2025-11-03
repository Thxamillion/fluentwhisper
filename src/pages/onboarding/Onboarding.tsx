import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/hooks/settings'
import { useAuth } from '@/hooks/auth'
import { useSubscription } from '@/hooks/subscription'
import { isCloudModel } from '@/stores/settingsStore'
import { AuthModal } from '@/components/AuthModal'
import { LanguageSelectionStep } from './LanguageSelectionStep'
import { ModelSelectionStep } from './ModelSelectionStep'
import { DownloadStep } from './DownloadStep'
import { CompleteStep } from './CompleteStep'

type OnboardingStep = 'language' | 'model' | 'download' | 'complete'

export function Onboarding() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettings()
  const { user } = useAuth()
  const { data: subscription } = useSubscription()

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('language')
  const [primaryLanguage, setPrimaryLanguage] = useState(settings.primaryLanguage || 'en')
  const [learningLanguage, setLearningLanguage] = useState(settings.targetLanguage || 'es')
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel || '')
  const [showAuthSuccess, setShowAuthSuccess] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Auto-select cloud model for premium users
  useEffect(() => {
    if (subscription?.isPremium && !selectedModel) {
      setSelectedModel('openai-whisper')
    }
  }, [subscription?.isPremium])

  // Listen for auth state changes and show success message
  useEffect(() => {
    // Only track auth changes when on model selection step
    if (currentStep !== 'model') return

    if (user && !showAuthSuccess) {
      // User just signed in, show success message
      setShowAuthSuccess(true)

      // Hide message after 3 seconds
      setTimeout(() => {
        setShowAuthSuccess(false)
      }, 3000)
    }
  }, [user, currentStep])

  const handleLanguageContinue = () => {
    // Save languages
    updateSetting('primaryLanguage', primaryLanguage)
    updateSetting('targetLanguage', learningLanguage)
    setCurrentStep('model')
  }

  const handleModelContinue = () => {
    // Save selected model
    updateSetting('selectedModel', selectedModel)

    // If cloud model, skip download
    if (isCloudModel(selectedModel)) {
      setCurrentStep('complete')
    } else {
      setCurrentStep('download')
    }
  }

  const handleSignIn = () => {
    // Show auth modal
    setShowAuthModal(true)
  }

  const handleDownloadComplete = () => {
    setCurrentStep('complete')
  }

  const handleDownloadCancel = () => {
    setCurrentStep('model')
  }

  const handleFinish = () => {
    // Mark onboarding as completed
    localStorage.setItem('onboarding_completed', 'true')
    // Navigate to main app
    navigate('/')
  }

  return (
    <>
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {currentStep === 'language' && (
        <LanguageSelectionStep
          primaryLanguage={primaryLanguage}
          learningLanguage={learningLanguage}
          onPrimaryLanguageChange={setPrimaryLanguage}
          onLearningLanguageChange={setLearningLanguage}
          onContinue={handleLanguageContinue}
        />
      )}

      {currentStep === 'model' && (
        <ModelSelectionStep
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onContinue={handleModelContinue}
          onSignIn={handleSignIn}
          showAuthSuccess={showAuthSuccess}
        />
      )}

      {currentStep === 'download' && (
        <DownloadStep
          modelName={selectedModel}
          onComplete={handleDownloadComplete}
          onCancel={handleDownloadCancel}
        />
      )}

      {currentStep === 'complete' && (
        <CompleteStep onFinish={handleFinish} />
      )}
    </>
  )
}
