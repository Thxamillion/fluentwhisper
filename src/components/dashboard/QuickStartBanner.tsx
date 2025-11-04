import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function QuickStartBanner() {
  const navigate = useNavigate()

  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Ready to practice?</h2>
            <p className="text-xs text-muted-foreground">Start a new recording session</p>
          </div>
          <Button
            size="sm"
            className="h-9 px-4"
            onClick={() => navigate('/record')}
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Recording
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
