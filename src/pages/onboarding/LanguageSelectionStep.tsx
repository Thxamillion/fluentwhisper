import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface LanguageSelectionStepProps {
  primaryLanguage: string
  learningLanguage: string
  onPrimaryLanguageChange: (lang: string) => void
  onLearningLanguageChange: (lang: string) => void
  onContinue: () => void
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
]

export function LanguageSelectionStep(props: LanguageSelectionStepProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to FluentWhisper!</h1>
          <p className="text-gray-600">Let's get you set up for success</p>
        </div>

        <div className="space-y-6">
          {/* Primary Language */}
          <div>
            <label className="block text-sm font-medium mb-2">
              What's your native language?
            </label>
            <select
              value={props.primaryLanguage}
              onChange={(e) => props.onPrimaryLanguageChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Learning Language */}
          <div>
            <label className="block text-sm font-medium mb-2">
              What language are you learning?
            </label>
            <select
              value={props.learningLanguage}
              onChange={(e) => props.onLearningLanguageChange(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={props.onContinue}
            className="w-full"
          >
            Continue
          </Button>
        </div>
      </Card>
    </div>
  )
}
