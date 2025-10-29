import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, Mic, Square, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRecording, useRecordingDevices } from '@/hooks/recording'
import { useDefaultModelInstalled } from '@/hooks/models'

export function Record() {
  const { data: isModelInstalled } = useDefaultModelInstalled();
  const { data: devices, isLoading: devicesLoading } = useRecordingDevices();
  const recording = useRecording();

  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>();
  const [transcript, setTranscript] = useState('');
  const [processingStage, setProcessingStage] = useState<'idle' | 'transcribing' | 'processing'>('idle');
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordToggle = async () => {
    if (recording.isRecording) {
      // Stop recording
      setProcessingStage('transcribing');
      try {
        const result = await recording.stopRecording();

        // Transcribe the audio
        const transcriptText = await recording.transcribe(result.filePath, selectedLanguage);
        setTranscript(transcriptText);

        // Complete the session (process words and save vocabulary)
        setProcessingStage('processing');
        if (recording.sessionId) {
          await recording.completeSession(
            recording.sessionId,
            result.filePath,
            transcriptText,
            result.durationSeconds,
            selectedLanguage
          );
        }

        setProcessingStage('idle');
      } catch (error) {
        console.error('Recording process failed:', error);
        setProcessingStage('idle');
      }
    } else {
      // Start recording
      setTranscript('');
      recording.startRecording(selectedLanguage, selectedDevice);
    }
  };

  const isProcessing = processingStage !== 'idle' || recording.isStopping;
  const canRecord = !devicesLoading && isModelInstalled && !isProcessing;

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
                      {processingStage === 'processing' && 'Processing vocabulary...'}
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

        {/* Transcript Preview */}
        {transcript && (
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 min-h-[100px]">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{transcript}</p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}