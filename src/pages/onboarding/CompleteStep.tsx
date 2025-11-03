import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface CompleteStepProps {
  onFinish: () => void
}

export function CompleteStep(props: CompleteStepProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Ready to Start!</h1>
          <p className="text-gray-600">
            You're all set to begin your language learning journey
          </p>
        </div>

        <Button
          onClick={props.onFinish}
          className="w-full"
        >
          Start Using FluentWhisper
        </Button>
      </Card>
    </div>
  )
}
