import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Mic, Square, Play, RotateCcw, Save, GitCompare, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTextLibraryItem } from '@/hooks/text-library';
import { useRecording } from '@/hooks/recording';
import { useUserVocab } from '@/hooks/vocabulary';
import { HighlightedText } from '@/components/read-aloud/HighlightedText';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSettingsStore } from '@/stores/settingsStore';
import { toast } from '@/lib/toast';
import { logger } from '@/services/logger'

export function ReadAloud() {
  const { textLibraryId } = useParams<{ textLibraryId: string }>();
  const navigate = useNavigate();
  const { settings } = useSettingsStore();

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
  const [transcriptSegments, setTranscriptSegments] = useState<import('@/services/recording/types').TranscriptSegment[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Adaptive pagination: Calculate words per page based on actual card height
  const textContainerRef = useRef<HTMLDivElement>(null);
  const [wordsPerPage, setWordsPerPage] = useState(100); // Default fallback

  useEffect(() => {
    const calculateWordsPerPage = () => {
      if (!textContainerRef.current) return;

      // Measure the CardContent container (has p-8 padding already applied)
      const containerHeight = textContainerRef.current.clientHeight;

      // CSS Grid: grid-rows-[1fr_auto]
      // First row (text content) gets remaining space automatically
      // Second row (pagination) takes only what it needs
      // We need to calculate based on ACTUAL first row height

      // Get the first child (text content div)
      const textContentDiv = textContainerRef.current.children[0] as HTMLElement;
      const availableHeight = textContentDiv?.clientHeight || containerHeight * 0.7;

      // text-lg = 18px, leading-relaxed = 1.625 → ~29px line height
      const lineHeight = 29;

      const linesPerPage = Math.floor(availableHeight / lineHeight);

      // Average words per line ≈ 10-12 for text-lg
      const avgWordsPerLine = 11;
      const calculatedWords = Math.floor(linesPerPage * avgWordsPerLine);

      // Set with min/max bounds (50-200 words)
      const bounded = Math.max(50, Math.min(200, calculatedWords));
      setWordsPerPage(bounded);
    };

    // Calculate on mount and window resize
    // Small delay to ensure grid layout is rendered
    const timer = setTimeout(calculateWordsPerPage, 100);
    window.addEventListener('resize', calculateWordsPerPage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculateWordsPerPage);
    };
  }, []);

  // Pagination: Split text into pages based on adaptive word count
  // IMPORTANT: Preserve paragraph breaks (\n\n) for better readability
  // IMPORTANT: Split mid-paragraph if needed to prevent overflow

  const pages = useMemo(() => {
    if (!textItem?.content) return [];

    // Split into paragraphs first (preserve \n\n breaks)
    const paragraphs = textItem.content.split(/\n\n+/);
    const pageList: string[] = [];
    let currentPage: string[] = [];
    let currentWordCount = 0;

    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) continue; // Skip empty paragraphs

      const words = trimmedPara.split(/\s+/);
      const paraWordCount = words.length;

      // CASE 1: Paragraph is too long - SPLIT MID-PARAGRAPH
      if (paraWordCount > wordsPerPage) {
        // First, finish current page if it has content
        if (currentPage.length > 0) {
          pageList.push(currentPage.join('\n\n'));
          currentPage = [];
          currentWordCount = 0;
        }

        // Split long paragraph into chunks
        for (let i = 0; i < words.length; i += wordsPerPage) {
          const chunk = words.slice(i, i + wordsPerPage).join(' ');
          pageList.push(chunk);
        }
        continue;
      }

      // CASE 2: Adding paragraph would exceed limit - start new page
      if (currentWordCount + paraWordCount > wordsPerPage && currentPage.length > 0) {
        pageList.push(currentPage.join('\n\n'));
        currentPage = [trimmedPara];
        currentWordCount = paraWordCount;
      } else {
        // CASE 3: Normal - add paragraph to current page
        currentPage.push(trimmedPara);
        currentWordCount += paraWordCount;
      }
    }

    // Add final page if it has content
    if (currentPage.length > 0) {
      pageList.push(currentPage.join('\n\n'));
    }

    return pageList;
  }, [textItem?.content, wordsPerPage]);

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
        settings.primaryLanguage,
        'read_aloud',
        textItem.id,
        currentPageText
      );
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      toast.error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTranscribe = async () => {
    if (!recordingResult) return;

    try {
      const transcriptResult = await transcribe(recordingResult.audioPath, textItem.language);
      if (transcriptResult) {
        setTranscript(transcriptResult.text);
        setTranscriptSegments(transcriptResult.segments);
        setShowTranscript(true);

        logger.debug(`Transcribed ${transcriptResult.segments.length} segments with timestamps`);
      }
    } catch (error) {
      console.error('Failed to transcribe:', error);
      toast.error(`Failed to transcribe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    if (!sessionId || !recordingResult || !transcript) return;

    try {
      await completeSession(
        sessionId,
        recordingResult.audioPath,
        transcript,
        transcriptSegments,
        recordingResult.durationSeconds,
        textItem.language
      );

      // Navigate to session detail
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error('Failed to save session:', error);
      toast.error(`Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRetry = () => {
    setRecordingResult(null);
    setTranscript('');
    setTranscriptSegments([]);
    setShowTranscript(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header with back button and recording controls */}
      <div className="p-4 border-b flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/library')}
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Library
        </Button>

        {/* Recording Controls - Top Right */}
        <div className="flex items-center gap-3">
          {!isRecording && !recordingResult ? (
            <button
              onClick={handleStartRecording}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl"
              title="Start recording"
            >
              <Mic className="w-5 h-5 text-white" />
            </button>
          ) : isRecording ? (
            <div className="flex items-center gap-3">
              <span className="text-base font-mono font-semibold text-red-600">
                {formatTime(elapsedTime)}
              </span>
              <button
                onClick={handleStopRecording}
                className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl animate-pulse"
                title="Stop recording"
              >
                <Square className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Play className="w-5 h-5 text-green-600" />
                <span className="text-sm font-mono text-green-600">
                  {formatTime(recordingResult?.durationSeconds || 0)}
                </span>
              </div>
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
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title and info header */}
          <div className="px-8 pt-6 pb-4 border-b">
            <h1 className="text-2xl font-bold mb-2">{textItem.title}</h1>
            <p className="text-sm text-muted-foreground">
              Read the following passage aloud. New vocabulary is highlighted.
            </p>
          </div>

          {/* Text container - fixed height, no scrolling */}
          <div className="flex-1 overflow-hidden px-8 pb-8 pt-8">
            <Card className="h-full flex flex-col">
              <CardContent ref={textContainerRef} className="p-8 h-full grid grid-rows-[1fr_auto] gap-0 overflow-hidden">
                {/* Text content - takes remaining space, measured for adaptive pagination */}
                <div className="overflow-hidden">
                  <div className="text-lg leading-relaxed">
                    <ErrorBoundary
                      fullScreen={false}
                      fallbackMessage="Error loading text. Please refresh the page."
                    >
                      <HighlightedText
                        text={currentPageText}
                        language={textItem.language}
                        userVocab={userVocab}
                      />
                    </ErrorBoundary>
                  </div>
                </div>

                {/* Pagination controls - compact, minimal whitespace */}
                {totalPages > 1 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="h-8 px-3"
                      >
                        <ChevronLeft className="w-3 h-3 mr-1" />
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="h-8 px-3"
                      >
                        Next
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
