import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/hooks/settings'
import { isCloudModel } from '@/stores/settingsStore'
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

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('language')
  // Auto-detect system language if not already set
  const [primaryLanguage, setPrimaryLanguage] = useState(
    settings.primaryLanguage || detectSystemLanguage()
  )
  const [learningLanguage, setLearningLanguage] = useState(settings.targetLanguage || 'es')
  const [selectedModel, setSelectedModel] = useState(settings.selectedModel || '')

  const handleLanguageContinue = () => {
    // Save languages
    updateSetting('primaryLanguage', primaryLanguage)
    updateSetting('targetLanguage', learningLanguage)
    setCurrentStep('model')
  }

  const handleModelContinue = () => {
    // If cloud model, save immediately (no download needed)
    if (isCloudModel(selectedModel)) {
      updateSetting('selectedModel', selectedModel)
      setCurrentStep('langpack-download')
    } else {
      // Local model - save after download completes
      setCurrentStep('download')
    }
  }

  const handleDownloadComplete = () => {
    // Save selected model after successful download
    updateSetting('selectedModel', selectedModel)
    // After model download, proceed to language pack download
    setCurrentStep('langpack-download')
  }

  const handleDownloadCancel = () => {
    setCurrentStep('model')
  }

  const handleLanguagePackDownloadComplete = useCallback(() => {
    setCurrentStep('complete')
  }, [])

  const handleFinish = () => {
    // Mark onboarding as completed
    localStorage.setItem('onboarding_completed', 'true')
    // Navigate to main app
    navigate('/')
  }

  return (
    <>
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
