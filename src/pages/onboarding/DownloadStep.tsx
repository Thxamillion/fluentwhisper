import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Download } from 'lucide-react'
import { useDownloadModel } from '@/hooks/models'
import { useEffect } from 'react'

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
      console.log('[DownloadStep] Download error, possibly already exists, advancing...');
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
            Check the download toast in the bottom-right corner for progress
          </p>
        </div>

        <div className="space-y-6">
          {/* Loading Spinner */}
          <div className="flex justify-center py-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>

          <div className="text-center text-sm text-gray-500">
            This may take a few minutes depending on your connection speed
          </div>

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
