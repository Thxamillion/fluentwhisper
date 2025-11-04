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
import { LanguagePackDownloadStep } from './LanguagePackDownloadStep'
import { CompleteStep } from './CompleteStep'

type OnboardingStep = 'language' | 'model' | 'download' | 'langpack-download' | 'complete'

/**
 * Detect system language and map to supported language code.
 * Falls back to 'en' if system language is not supported.
 */
function detectSystemLanguage(): string {
  const browserLang = navigator.language.toLowerCase()

  // Map browser language codes to our supported languages
  const langMap: Record<string, string> = {
    'en': 'en', 'en-us': 'en', 'en-gb': 'en',
    'es': 'es', 'es-es': 'es', 'es-mx': 'es',
    'fr': 'fr', 'fr-fr': 'fr', 'fr-ca': 'fr',
    'de': 'de', 'de-de': 'de', 'de-at': 'de',
    'it': 'it', 'it-it': 'it',
    'pt': 'pt', 'pt-br': 'pt', 'pt-pt': 'pt',
    'zh': 'zh', 'zh-cn': 'zh', 'zh-tw': 'zh',
    'ja': 'ja', 'ja-jp': 'ja',
    'ko': 'ko', 'ko-kr': 'ko',
    'ar': 'ar', 'ar-sa': 'ar',
    'ru': 'ru', 'ru-ru': 'ru',
  }

  // Try exact match first, then try base language code
  if (langMap[browserLang]) {
    return langMap[browserLang]
  }

  const baseLang = browserLang.split('-')[0]
  return langMap[baseLang] || 'en'
}

export function Onboarding() {
  const navigate = useNavigate()
  const { settings, updateSetting } = useSettings()
  const { user } = useAuth()
  const { data: subscription } = useSubscription()

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('language')
  // Auto-detect system language if not already set
  const [primaryLanguage, setPrimaryLanguage] = useState(
    settings.primaryLanguage || detectSystemLanguage()
  )
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

    // If cloud model, skip model download
    if (isCloudModel(selectedModel)) {
      // But still need to download language packs
      setCurrentStep('langpack-download')
    } else {
      setCurrentStep('download')
    }
  }

  const handleSignIn = () => {
    // Show auth modal
    setShowAuthModal(true)
  }

  const handleDownloadComplete = () => {
    // After model download, proceed to language pack download
    setCurrentStep('langpack-download')
  }

  const handleDownloadCancel = () => {
    setCurrentStep('model')
  }

  const handleLanguagePackDownloadComplete = () => {
    setCurrentStep('complete')
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

      {currentStep === 'langpack-download' && (
        <LanguagePackDownloadStep
          primaryLanguage={primaryLanguage}
          learningLanguage={learningLanguage}
          onComplete={handleLanguagePackDownloadComplete}
          onSkip={handleLanguagePackDownloadComplete}
        />
      )}

      {currentStep === 'complete' && (
        <CompleteStep onFinish={handleFinish} />
      )}
    </>
  )
}
