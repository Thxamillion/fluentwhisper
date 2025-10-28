/**
 * First Run Check - Shows banner if Whisper model is not installed
 */

import { AlertCircle, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDefaultModelInstalled } from '../hooks/models';

export function FirstRunCheck() {
  const { data: isInstalled, isLoading } = useDefaultModelInstalled();

  // Don't show anything while loading or if model is installed
  if (isLoading || isInstalled) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                Setup Required: Whisper model not installed
              </p>
              <p className="text-xs text-yellow-700">
                Download the Whisper model to enable speech transcription
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            Download Model
          </Link>
        </div>
      </div>
    </div>
  );
}
