import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Square, Play, RotateCcw, Save, GitCompare, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTextLibraryItem } from '@/hooks/text-library';
import { useRecording } from '@/hooks/recording';
import { useUserVocab } from '@/hooks/vocabulary';
import { HighlightedText } from '@/components/read-aloud/HighlightedText';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function ReadAloud() {
  const { textLibraryId } = useParams<{ textLibraryId: string }>();
  const navigate = useNavigate();

  const { data: textItem, isLoading: isLoadingText } = useTextLibraryItem(textLibraryId!);
  const { data: userVocab = [] } = useUserVocab((textItem?.language || 'es') as any);
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
  const [currentPage, setCurrentPage] = useState(0);

  // Pagination: Split text into pages based on word count
  // Aim for ~150-200 words per page for comfortable reading
  const WORDS_PER_PAGE = 150;

  const pages = useMemo(() => {
    if (!textItem?.content) return [];

    const words = textItem.content.split(/\s+/);
    const pageList: string[] = [];

    for (let i = 0; i < words.length; i += WORDS_PER_PAGE) {
      const pageWords = words.slice(i, i + WORDS_PER_PAGE);
      pageList.push(pageWords.join(' '));
    }

    return pageList;
  }, [textItem?.content]);

  const totalPages = pages.length;
  const currentPageText = pages[currentPage] || '';

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
    try {
      // Pass the current page text as source, not the entire content
      await startRecording(
        textItem.language,
        undefined,
        'read_aloud',
        textItem.id,
        currentPageText
      );
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check the console for details.`);
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await stopRecording();
      if (result) {
        setRecordingResult({
          audioPath: result.filePath,
          durationSeconds: result.durationSeconds,
        });
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      alert(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTranscribe = async () => {
    if (!recordingResult) return;

    try {
      const transcriptText = await transcribe(recordingResult.audioPath, textItem.language);
      if (transcriptText) {
        setTranscript(transcriptText);
        setShowTranscript(true);
      }
    } catch (error) {
      console.error('Failed to transcribe:', error);
      alert(`Failed to transcribe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    if (!sessionId || !recordingResult || !transcript) return;

    try {
      await completeSession(
        sessionId,
        recordingResult.audioPath,
        transcript,
        recordingResult.durationSeconds,
        textItem.language
      );

      // Navigate to session detail
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error('Failed to save session:', error);
      alert(`Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    <div className="h-screen flex flex-col">
      {/* Header with back button */}
      <div className="p-4 border-b">
        <Button
          variant="ghost"
          onClick={() => navigate('/library')}
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title and info header */}
          <div className="px-8 pt-6 pb-4 border-b">
            <h1 className="text-2xl font-bold mb-2">{textItem.title}</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Read the following passage aloud. New vocabulary is highlighted.
              </p>
              {totalPages > 1 && (
                <span className="text-sm text-muted-foreground">
                  • Page {currentPage + 1} of {totalPages}
                </span>
              )}
            </div>
          </div>

          {/* Text container - fixed height, no scrolling */}
          <div className="flex-1 overflow-hidden px-8 pb-8 pt-8">
            <Card className="h-full flex flex-col">
              <CardContent className="p-8 flex-1 flex flex-col overflow-hidden">
                {/* Text content - takes remaining space */}
                <div className="flex-1 overflow-hidden">
                  <div className="text-lg leading-relaxed">
                    <ErrorBoundary
                      fallback={
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-yellow-800 text-sm">
                            Error loading text. Please refresh the page.
                          </p>
                        </div>
                      }
                    >
                      <HighlightedText
                        text={currentPageText}
                        language={textItem.language}
                        userVocab={userVocab}
                      />
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Pagination and recording controls - always visible at bottom */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    {/* Previous Button */}
                    {totalPages > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                    )}

                    {/* Recording Control */}
                    <div className="flex items-center gap-3">
                      {!isRecording && !recordingResult ? (
                        <button
                          onClick={handleStartRecording}
                          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl"
                          title="Start recording"
                        >
                          <Mic className="w-6 h-6 text-white" />
                        </button>
                      ) : isRecording ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleStopRecording}
                            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl animate-pulse"
                            title="Stop recording"
                          >
                            <Square className="w-6 h-6 text-white" />
                          </button>
                          <span className="text-lg font-mono font-semibold text-red-600">
                            {formatTime(elapsedTime)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <Play className="w-6 h-6 text-green-600" />
                          </div>
                          <span className="text-sm font-mono text-muted-foreground">
                            {formatTime(recordingResult?.durationSeconds || 0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Next Button */}
                    {totalPages > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>

                  {/* Action buttons - show when recording is done */}
                  {recordingResult && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        disabled={isTranscribing || isCompleting}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTranscribe}
                        disabled={isTranscribing || isCompleting || !!transcript}
                      >
                        {isTranscribing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Transcribing...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Transcribe
                          </>
                        )}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        disabled={!transcript || isCompleting}
                      >
                        {isCompleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <GitCompare className="w-4 h-4 mr-2" />
                            Save & Compare
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
