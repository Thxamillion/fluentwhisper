import { useSubscription } from '@/hooks/subscription'
import { DesktopSubscriptionService } from '@/services/subscription'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: React.ReactNode
  featureName?: string
}

export function PremiumFeature({ children, featureName = 'This feature' }: Props) {
  const { data: subscription, isLoading, refetch } = useSubscription()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!subscription?.isPremium) {
    return (
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="text-center">
          <CardTitle>Premium Feature</CardTitle>
          <CardDescription>{featureName} requires Premium</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => DesktopSubscriptionService.openUpgradePage()}
            className="w-full"
            size="lg"
          >
            Upgrade on Web
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <Button
            onClick={() => refetch()}
            variant="ghost"
            className="w-full text-sm"
          >
            I just upgraded, check again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
