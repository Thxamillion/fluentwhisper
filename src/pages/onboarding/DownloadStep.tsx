import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useDownloadModel } from '@/hooks/models'
import { useEffect } from 'react'

interface DownloadStepProps {
  modelName: string
  onComplete: () => void
  onCancel: () => void
}

export function DownloadStep(props: DownloadStepProps) {
  const downloadModel = useDownloadModel()
  const progress = downloadModel.progress

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
  }, [downloadModel.isSuccess])

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Downloading Model...</h1>
          <p className="text-gray-600">This may take a few minutes</p>
        </div>

        <div className="space-y-6">
          {/* Progress Bar */}
          {progress && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-4 transition-all duration-300 ease-out flex items-center justify-center"
                  style={{ width: `${progress.percentage}%` }}
                >
                  <span className="text-xs text-white font-medium">
                    {Math.round(progress.percentage)}%
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-600">
                {Math.round(progress.downloadedBytes / 1024 / 1024)} MB /{' '}
                {Math.round(progress.totalBytes / 1024 / 1024)} MB
              </div>
            </>
          )}

          {/* Loading Spinner */}
          {!progress && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
            </div>
          )}

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
