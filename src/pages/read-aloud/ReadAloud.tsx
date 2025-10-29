import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Square, Play, RotateCcw, Save, GitCompare, Loader2 } from 'lucide-react';
import { useTextLibraryItem } from '@/hooks/text-library';
import { useRecording } from '@/hooks/recording';
import { useUserVocab } from '@/hooks/vocabulary';
import { HighlightedText } from '@/components/read-aloud/HighlightedText';

export function ReadAloud() {
  const { textLibraryId } = useParams<{ textLibraryId: string }>();
  const navigate = useNavigate();

  const { data: textItem, isLoading: isLoadingText } = useTextLibraryItem(textLibraryId!);
  const { data: userVocab = [] } = useUserVocab(textItem?.language || 'es');
  const {
    isRecording,
    sessionId,
    elapsedTime,
    startRecording,
    stopRecording,
    transcribe,
    completeSession,
    isTranscribing,
    isCompleting,
  } = useRecording();

  const [recordingResult, setRecordingResult] = useState<{
    audioPath: string;
    durationSeconds: number;
  } | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [showTranscript, setShowTranscript] = useState(false);

  if (isLoadingText) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!textItem) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg text-muted-foreground mb-4">Text not found</p>
        <Button onClick={() => navigate('/library')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>
      </div>
    );
  }

  const handleStartRecording = async () => {
    await startRecording(
      textItem.language,
      undefined,
      'read_aloud',
      textItem.id,
      textItem.content
    );
  };

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result) {
      setRecordingResult({
        audioPath: result.filePath,
        durationSeconds: result.durationSeconds,
      });
    }
  };

  const handleTranscribe = async () => {
    if (!recordingResult) return;

    const transcriptText = await transcribe(recordingResult.audioPath, textItem.language);
    if (transcriptText) {
      setTranscript(transcriptText);
      setShowTranscript(true);
    }
  };

  const handleSave = async () => {
    if (!sessionId || !recordingResult || !transcript) return;

    await completeSession(
      sessionId,
      recordingResult.audioPath,
      transcript,
      recordingResult.durationSeconds,
      textItem.language
    );

    // Navigate to session detail
    navigate(`/session/${sessionId}`);
  };

  const handleRetry = () => {
    setRecordingResult(null);
    setTranscript('');
    setShowTranscript(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex">
      {/* Left side - Text content */}
      <div className="flex-1 p-8 overflow-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/library')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>

        <div className="max-w-3xl">
          {/* Text container */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <HighlightedText
                text={textItem.content}
                language={textItem.language}
                userVocab={userVocab}
              />
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button variant="outline">
              Next
              <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right sidebar - Recording controls */}
      <div className="w-96 bg-gray-50 dark:bg-gray-900 p-8 border-l flex flex-col">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-2">Your Voice</h2>
          <p className="text-sm text-muted-foreground mb-8">
            Press the button to start recording.
          </p>

          {/* Record button */}
          <div className="flex flex-col items-center mb-8">
            {!isRecording && !recordingResult ? (
              <button
                onClick={handleStartRecording}
                className="w-32 h-32 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                <Mic className="w-12 h-12 text-white" />
              </button>
            ) : isRecording ? (
              <button
                onClick={handleStopRecording}
                className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl animate-pulse"
              >
                <Square className="w-12 h-12 text-white" />
              </button>
            ) : (
              <div className="w-32 h-32 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Play className="w-12 h-12 text-green-600" />
              </div>
            )}

            {/* Timer */}
            <div className="mt-6 text-center">
              <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(isRecording ? elapsedTime : recordingResult?.durationSeconds || 0)}
              </div>
            </div>
          </div>

          {/* Waveform visualization placeholder */}
          <div className="h-20 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center mb-8">
            <div className="flex items-end gap-1 h-12">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-blue-600 rounded-full transition-all"
                  style={{
                    height: isRecording
                      ? `${Math.random() * 100}%`
                      : '20%',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Playback & Actions */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Playback & Actions</h3>

          {/* Play button (if recorded) */}
          {recordingResult && (
            <Button
              variant="outline"
              className="w-full mb-3"
              disabled
            >
              <Play className="w-4 h-4 mr-2" />
              Play Recording
            </Button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={!recordingResult || isTranscribing || isCompleting}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTranscribe}
              disabled={!recordingResult || isTranscribing || isCompleting || !!transcript}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!transcript || isCompleting}
            >
              {isCompleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitCompare className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs text-center mt-1 text-muted-foreground">
            <div>Retry</div>
            <div>Save</div>
            <div>Compare</div>
          </div>

          {/* Show transcript if available */}
          {showTranscript && transcript && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-2">Transcript:</h4>
                <p className="text-sm text-muted-foreground">{transcript}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
