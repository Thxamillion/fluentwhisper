import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useDownloadModel } from '@/hooks/models'
import { DownloadProgress } from '@/components/DownloadProgress'
import { useEffect } from 'react'
import { logger } from '@/services/logger'

interface DownloadStepProps {
  modelName: string
  onComplete: () => void
  onCancel: () => void
}

export function DownloadStep(props: DownloadStepProps) {
  const downloadModel = useDownloadModel()

  useEffect(() => {
    // Start download when component mounts
    if (!downloadModel.isPending && !downloadModel.isSuccess) {
      downloadModel.mutate(props.modelName)
    }
  }, [props.modelName])

  useEffect(() => {
    // When download completes, move to next step
    if (downloadModel.isSuccess) {
      props.onComplete()
    }
  }, [downloadModel.isSuccess, props.onComplete])

  // If download errors (e.g., already exists), also advance
  useEffect(() => {
    if (downloadModel.isError) {
      logger.debug('Download error, possibly already exists, advancing...', 'DownloadStep');
      props.onComplete()
    }
  }, [downloadModel.isError, props.onComplete])

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Download className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Downloading Whisper Model</h1>
          <p className="text-gray-600">
            This may take a few minutes depending on your connection speed
          </p>
        </div>

        <div className="space-y-6">
          {/* Download Progress */}
          <DownloadProgress />

          {/* Cancel Button */}
          <Button
            onClick={props.onCancel}
            variant="outline"
            className="w-full"
            disabled={downloadModel.isSuccess}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}
