import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Mic, Square, Loader2, CheckCircle, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRecording, useRecordingDevices } from '@/hooks/recording'
import { useDefaultModelInstalled } from '@/hooks/models'
import { useNavigate } from 'react-router-dom'
import { AudioPlayer } from '@/components/AudioPlayer'
import { convertFileSrc } from '@tauri-apps/api/core'

export function Record() {
  const navigate = useNavigate();
  const { data: isModelInstalled } = useDefaultModelInstalled();
  const { data: devices, isLoading: devicesLoading } = useRecordingDevices();
  const recording = useRecording();

  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>();
  const [transcript, setTranscript] = useState('');
  const [processingStage, setProcessingStage] = useState<'idle' | 'transcribing' | 'review' | 'saving' | 'complete'>('idle');
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [recordingData, setRecordingData] = useState<{
    filePath: string;
    durationSeconds: number;
  } | null>(null);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordToggle = async () => {
    if (recording.isRecording) {
      // Stop recording (no transcription yet)
      try {
        const result = await recording.stopRecording();
        setRecordingData(result);

        // Show review state without transcribing
        setProcessingStage('review');
      } catch (error) {
        console.error('Recording process failed:', error);
        setProcessingStage('idle');
      }
    } else {
      // Start recording
      setTranscript('');
      setRecordingData(null);
      setProcessingStage('idle');
      recording.startRecording(selectedLanguage, selectedDevice);
    }
  };

  const handleTranscribeAndSave = async () => {
    if (!recordingData || !recording.sessionId) return;

    // First transcribe
    setProcessingStage('transcribing');
    try {
      const transcriptText = await recording.transcribe(recordingData.filePath, selectedLanguage);
      setTranscript(transcriptText);

      // Then save
      setProcessingStage('saving');
      await recording.completeSession(
        recording.sessionId,
        recordingData.filePath,
        transcriptText,
        recordingData.durationSeconds,
        selectedLanguage
      );

      // Navigate to session details immediately after saving
      navigate(`/session/${recording.sessionId}`);
    } catch (error) {
      console.error('Failed to transcribe/save session:', error);
      alert('Failed to process session. Please try again.');
      setProcessingStage('review');
    }
  };

  const handleDiscardSession = () => {
    // TODO: Delete the audio file from disk
    setTranscript('');
    setRecordingData(null);
    setProcessingStage('idle');
    setSelectedPrompt(null);
  };

  const isProcessing = processingStage === 'transcribing' || processingStage === 'saving' || recording.isStopping;
  const canRecord = !devicesLoading && isModelInstalled && !isProcessing && processingStage === 'idle';

  const prompts = [
    'Describe your day in detail',
    'Practice introducing yourself',
    'Read a short passage aloud',
    'Talk about your goals and dreams',
  ];

  const handlePromptClick = (prompt: string) => {
    setSelectedPrompt(prompt);
    setPromptsExpanded(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Practice</h1>
        <p className="text-muted-foreground">Hone your pronunciation and get instant feedback.</p>
      </div>

      <div className="space-y-6">
        {/* Collapsible Prompt Picker */}
        <div className="relative border rounded-lg">
          <button
            onClick={() => setPromptsExpanded(!promptsExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
          >
            <span className="text-sm font-medium text-muted-foreground">Practice Prompts (Optional)</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${promptsExpanded ? 'rotate-180' : ''}`} />
          </button>

          {promptsExpanded && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-950 border rounded-lg shadow-lg z-10 px-4 py-4 space-y-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors text-sm ${
                    selectedPrompt === prompt ? 'bg-blue-100 dark:bg-blue-900/20 font-medium' : ''
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Prompt Display */}
        {selectedPrompt && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">PRACTICE PROMPT</p>
                  <p className="text-sm font-medium">{selectedPrompt}</p>
                </div>
                <button
                  onClick={() => setSelectedPrompt(null)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Clear
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recorder Panel */}
        <Card>
          <CardContent className="pt-6">
            <div className="py-12 text-center">
                {!isModelInstalled && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-900">
                      Please download a Whisper model in Settings before recording.
                    </p>
                  </div>
                )}

                {isProcessing && (
                  <div className="mb-6">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {processingStage === 'transcribing' && 'Transcribing audio...'}
                      {processingStage === 'saving' && 'Saving session...'}
                    </p>
                  </div>
                )}

                {!isProcessing && (
                  <>
                    <p className="text-muted-foreground mb-10">
                      {recording.isRecording ? 'Recording in progress...' : 'Press the button to start recording'}
                    </p>
                    <div className="space-y-6">
                      <Button
                        size="icon"
                        className={`w-24 h-24 rounded-full ${
                          recording.isRecording
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white shadow-lg`}
                        onClick={handleRecordToggle}
                        disabled={!canRecord || recording.isStarting}
                      >
                        {recording.isStarting ? (
                          <Loader2 className="w-10 h-10 animate-spin" />
                        ) : recording.isRecording ? (
                          <Square className="w-10 h-10" />
                        ) : (
                          <Mic className="w-10 h-10" />
                        )}
                      </Button>
                      <div className="flex justify-center text-3xl font-mono">
                        <span className={recording.isRecording ? 'text-red-600 font-bold' : 'text-muted-foreground'}>
                          {formatTime(recording.elapsedTime)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

        {/* Review Recording */}
        {recordingData && processingStage === 'review' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Review Your Recording</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Duration: {formatTime(Math.floor(recordingData.durationSeconds))}
                  </p>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <AudioPlayer src={convertFileSrc(recordingData.filePath)} />
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button onClick={handleDiscardSession} variant="outline" className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Discard
                  </Button>
                  <Button onClick={handleTranscribeAndSave} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Transcribe & Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </div>
  )
}