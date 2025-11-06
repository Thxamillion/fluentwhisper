import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, Zap, Cloud, Lock, Sparkles } from 'lucide-react'
import { DesktopSubscriptionService } from '@/services/subscription'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PremiumInfoModal({ open, onOpenChange }: Props) {
  const handleUpgrade = () => {
    DesktopSubscriptionService.openUpgradePage()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Unlock the best transcription experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Benefits */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Large Models</h4>
                <p className="text-sm text-muted-foreground">
                  Access Large, Large-v2, and Large-v3 models for up to 3x better accuracy.
                  Perfect for complex conversations and technical vocabulary.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Unlimited Cloud Transcription</h4>
                <p className="text-sm text-muted-foreground">
                  Use OpenAI's Whisper API with no limits. Best-in-class accuracy,
                  works on any device.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Works on Any Hardware</h4>
                <p className="text-sm text-muted-foreground">
                  Cloud transcription requires no local processing. Perfect for older devices.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Premium Plan</p>
                <p className="text-3xl font-bold text-foreground">$10<span className="text-lg text-muted-foreground">/month</span></p>
              </div>
              <Button onClick={handleUpgrade} size="lg" className="gap-2">
                Upgrade Now
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Fine print */}
          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. You'll be redirected to complete your purchase.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
