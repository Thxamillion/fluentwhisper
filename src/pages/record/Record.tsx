import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookOpen, Sparkles, Mic, Square, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRecording, useRecordingDevices } from '@/hooks/recording'
import { useDefaultModelInstalled } from '@/hooks/models'

export function Record() {
  const { data: isModelInstalled } = useDefaultModelInstalled();
  const { data: devices, isLoading: devicesLoading } = useRecordingDevices();
  const recording = useRecording();

  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>();
  const [transcript, setTranscript] = useState('');
  const [processingStage, setProcessingStage] = useState<'idle' | 'transcribing' | 'processing'>('idle');

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
      recording.startRecording(selectedDevice);
    }
  };

  const isProcessing = processingStage !== 'idle' || recording.isStopping;
  const canRecord = !devicesLoading && isModelInstalled && !isProcessing;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Practice</h1>
        <p className="text-muted-foreground">Hone your pronunciation and get instant feedback.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Prompt & Settings */}
        <div className="space-y-6">
          {/* Prompt Picker */}
          <Card>
            <CardHeader>
              <CardTitle>Prompt Picker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a prompt from your library" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prompt1">Practice conversation</SelectItem>
                    <SelectItem value="prompt2">Reading passage</SelectItem>
                    <SelectItem value="prompt3">Pronunciation drill</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="mt-2" size="sm">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Library
                </Button>
              </div>

              <div className="text-center text-muted-foreground text-sm">or</div>

              <div>
                <Textarea
                  placeholder="Write your own prompt..."
                  className="h-32 resize-none"
                />
                <Button className="mt-2 text-white" size="sm">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Input & Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Input & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={recording.isRecording}>
                  <SelectTrigger>
                    <SelectValue placeholder="English" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Microphone</label>
                <Select
                  value={selectedDevice}
                  onValueChange={setSelectedDevice}
                  disabled={recording.isRecording || devicesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={devicesLoading ? "Loading devices..." : "Default Microphone"} />
                  </SelectTrigger>
                  <SelectContent>
                    {devices?.map((device) => (
                      <SelectItem key={device.name} value={device.name}>
                        {device.name} {device.isDefault ? '(Default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Recorder */}
        <div className="space-y-6">
          {/* Recorder Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Recorder Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-8 text-center mb-6">
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
                    <p className="text-muted-foreground mb-8">
                      {recording.isRecording ? 'Recording in progress...' : 'Press the button to start recording'}
                    </p>
                    <div className="space-y-4">
                      <div className="flex justify-center space-x-4 text-2xl font-mono">
                        <span className={recording.isRecording ? 'text-red-600' : ''}>
                          {formatTime(recording.elapsedTime)}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        className={`w-16 h-16 rounded-full ${
                          recording.isRecording
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                        onClick={handleRecordToggle}
                        disabled={!canRecord || recording.isStarting}
                      >
                        {recording.isStarting ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : recording.isRecording ? (
                          <Square className="w-6 h-6" />
                        ) : (
                          <Mic className="w-6 h-6" />
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transcript Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Transcript Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 min-h-[100px]">
                {transcript ? (
                  <p className="text-foreground whitespace-pre-wrap">{transcript}</p>
                ) : (
                  <p className="text-muted-foreground">
                    {recording.isRecording
                      ? 'Recording... Transcript will appear after you stop.'
                      : 'Your transcript will appear here after recording...'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                  <div className="text-sm text-muted-foreground">Fluency</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                  <div className="text-sm text-muted-foreground">Speed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}