/**
 * Whisper Model Download Section for Settings
 */

import { Download, Check, Trash2, Loader2 } from 'lucide-react';
import {
  useAvailableModels,
  useDefaultModelInstalled,
  useDownloadModel,
  useDeleteModel,
  useInstalledModels,
} from '../../hooks/models';

export function WhisperModelSection() {
  const { data: availableModels, isLoading: loadingAvailable } = useAvailableModels();
  const { data: isDefaultInstalled, isLoading: loadingInstalled } = useDefaultModelInstalled();
  const { data: installedModels } = useInstalledModels();
  const downloadModel = useDownloadModel();
  const deleteModel = useDeleteModel();

  const handleDownload = (modelName: string) => {
    downloadModel.mutate(modelName);
  };

  const handleDelete = (modelName: string) => {
    if (window.confirm(`Are you sure you want to delete the ${modelName} model?`)) {
      deleteModel.mutate(modelName);
    }
  };

  if (loadingAvailable || loadingInstalled) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Whisper Model</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const defaultModel = availableModels?.find((m) => m.name === 'base');
  const isDownloading = downloadModel.isPending;
  const progress = downloadModel.progress;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border">
      <h2 className="text-xl font-semibold mb-4">Whisper Model</h2>

      {/* Status Banner */}
      {isDefaultInstalled ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900">Model Installed</h3>
            <p className="text-sm text-green-700">
              The Whisper model is installed and ready for transcription.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <Download className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">Model Required</h3>
            <p className="text-sm text-yellow-700">
              Download a Whisper model to enable speech transcription.
            </p>
          </div>
        </div>
      )}

      {/* Available Models */}
      <div className="space-y-3">
        {availableModels?.map((model) => {
          const isInstalled = installedModels?.some((m) => m.name === model.name);
          const isCurrentlyDownloading = isDownloading && downloadModel.variables === model.name;

          return (
            <div
              key={model.name}
              className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{model.displayName}</h3>
                    {isInstalled && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                        Installed
                      </span>
                    )}
                    {model.name === 'base' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{model.description}</p>
                  <p className="text-xs text-gray-500">Size: {model.sizeMb} MB</p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {isInstalled ? (
                    <button
                      onClick={() => handleDelete(model.name)}
                      disabled={deleteModel.isPending}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDownload(model.name)}
                      disabled={isDownloading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isCurrentlyDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {isCurrentlyDownloading && progress && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Downloading...</span>
                    <span>
                      {Math.round(progress.downloadedBytes / 1024 / 1024)} MB /{' '}
                      {Math.round(progress.totalBytes / 1024 / 1024)} MB (
                      {Math.round(progress.percentage)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 transition-all duration-300 ease-out"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Tip:</strong> The Base model is recommended for most users. It provides good
          accuracy while maintaining fast processing speeds. Models are downloaded once and stored
          locally.
        </p>
      </div>
    </div>
  );
}
