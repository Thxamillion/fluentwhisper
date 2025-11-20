import { useParams, useNavigate } from 'react-router-dom';
import { useSession, useSessionWords, useDeleteSession } from '@/hooks/sessions';
import { useTextLibraryItem } from '@/hooks/text-library';
import { useDeleteVocabWord, useAddVocabTag, useRemoveVocabTag } from '@/hooks/vocabulary';
import { Loader2, ArrowLeft, Trash2, Clock, MessageSquare, TrendingUp, BookOpen, Sparkles, ArrowUp, Minus, Plus, X } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AudioPlayer } from '@/components/AudioPlayer';
import { useSidebar } from '@/contexts/SidebarContext';
import { useState, useEffect, useRef } from 'react';
import { toast } from '@/lib/toast';
import { logger } from '@/services/logger';
import { LangCode, VOCAB_TAGS } from '@/services/vocabulary/types';

export function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();

  const { data: session, isLoading: sessionLoading } = useSession(sessionId!);
  const { data: words, isLoading: wordsLoading } = useSessionWords(sessionId!);
  const deleteSession = useDeleteSession();
  const deleteWord = useDeleteVocabWord();
  const addTag = useAddVocabTag();
  const removeTag = useRemoveVocabTag();

  // Fetch text library item for read-aloud sessions
  const { data: textItem } = useTextLibraryItem(session?.textLibraryId || '');

  // Infinite scroll state
  const [displayedWords, setDisplayedWords] = useState<typeof words>([]);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const WORDS_PER_LOAD = 15; // Load 15 words at a time (5 rows of 3)

  // Scroll to top button state - show when words are loaded and > 15
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Confirm dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Track scroll position
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrollY = target.scrollTop || window.scrollY || document.documentElement.scrollTop;
      setShowScrollTop(scrollY > 200);
    };

    // Add listeners to both window and main content
    window.addEventListener('scroll', handleScroll);
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
    }

    // Initial check - show button if we have many words
    if (words && words.length > 15) {
      setShowScrollTop(true);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [words]);

  const scrollToTop = () => {
    // Scroll both window and main element
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Initialize with first batch of words
  useEffect(() => {
    if (words && words.length > 0) {
      setDisplayedWords(words.slice(0, WORDS_PER_LOAD));
      setHasMore(words.length > WORDS_PER_LOAD);
    }
  }, [words]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && words && displayedWords) {
          // Load more words
          const currentLength = displayedWords.length;
          const nextBatch = words.slice(currentLength, currentLength + WORDS_PER_LOAD);

          if (nextBatch.length > 0) {
            setDisplayedWords((prev) => [...(prev ?? []), ...nextBatch]);
            setHasMore(currentLength + nextBatch.length < words.length);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [displayedWords, hasMore, words]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      es: 'Spanish',
      en: 'English',
      fr: 'French',
    };
    return names[code] || code;
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteSession.mutateAsync(sessionId!);
      toast.success('Session deleted successfully');
      navigate('/history');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-foreground mb-2">Session not found</h2>
          <p className="text-muted-foreground mb-6">This session may have been deleted or doesn't exist.</p>
          <button
            onClick={() => navigate('/history')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  const audioSrc = session.audioPath ? convertFileSrc(session.audioPath) : null;

  // Debug logging
  if (session.audioPath) {
    logger.debug('Original audio path:', session.audioPath);
    logger.debug('Converted audio src', undefined, audioSrc);
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-4">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Session History</span>
        </button>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {session.sessionType === 'read_aloud' && textItem ? (
                <>"{textItem.title}"</>
              ) : (
                <>Recording Session</>
              )} - {formatDate(session.startedAt)}
            </h1>
            <p className="text-muted-foreground">{getLanguageName(session.language)}</p>
          </div>
          <button
            onClick={handleDeleteClick}
            disabled={deleteSession.isPending}
            className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            title="Delete session"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Audio Player - Sticky Bottom */}
      {audioSrc && (
        <div
          className="fixed bottom-4 left-0 right-0 z-50 px-8 transition-all duration-300"
          style={{
            marginLeft: isCollapsed ? '88px' : '280px' // Sidebar width + margin
          }}
        >
          <div className="mr-4 border border-border rounded-xl bg-card/80 backdrop-blur-md p-4 shadow-lg">
            <AudioPlayer src={audioSrc} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column: Transcript + Words */}
        <div className="col-span-2 space-y-8">
          {/* Read-aloud sessions: Side-by-side comparison */}
          {session.sessionType === 'read_aloud' && session.sourceText ? (
            <div className="grid grid-cols-2 gap-4">
                {/* Source Text */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Original Text</h4>
                  <Card className="p-6 h-[400px] overflow-y-auto">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {session.sourceText}
                    </p>
                  </Card>
                </div>

                {/* Transcript */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Your Recording</h4>
                  {session.transcript ? (
                    <Card className="p-6 h-[400px] overflow-y-auto">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {session.transcript}
                      </p>
                    </Card>
                  ) : (
                    <Card className="p-6 h-[400px] flex items-center justify-center text-muted-foreground">
                      No transcript available
                    </Card>
                  )}
                </div>
              </div>
          ) : (
            /* Free speak sessions: Single transcript view */
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">Transcript</h3>
              {session.transcript ? (
                <Card className="p-6">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {session.transcript}
                  </p>
                </Card>
              ) : (
                <Card className="p-6 text-center text-muted-foreground">
                  No transcript available
                </Card>
              )}
            </div>
          )}

          {/* Vocabulary Words */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">
              Vocabulary ({words?.length || 0} words)
            </h3>
            {wordsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : words && words.length > 0 ? (
              <div>
                <div className="grid grid-cols-3 gap-3">
                  {(displayedWords ?? []).map((word) => (
                    <Card key={word.lemma} className="p-3 hover:bg-muted/50 transition-colors group relative">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-base font-medium text-foreground truncate">
                          {word.lemma}
                        </span>
                        {word.isNew && (
                          <span className="flex-shrink-0 flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded-full">
                            <Sparkles className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            × {word.count}
                          </span>
                          <div className="relative flex items-center gap-1">
                            {/* "..." indicator - shows when not hovering */}
                            <span className="text-xs text-muted-foreground opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
                              •••
                            </span>
                            {/* Buttons - show on hover */}
                            <div className="absolute right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Remove tag button - only show if word has a tag */}
                              {word.tags && word.tags.length > 0 && (
                                <button
                                  onClick={() => removeTag.mutate({ lemma: word.lemma, language: session?.language as LangCode, tag: word.tags![0] })}
                                  disabled={removeTag.isPending}
                                  className="group/btn flex items-center gap-1 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                  title="Remove tag"
                                >
                                  <Minus className="w-3 h-3 text-red-600 dark:text-red-400" />
                                  <span className="text-[10px] text-red-600 dark:text-red-400 opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                    Remove
                                  </span>
                                </button>
                              )}
                              {/* Add needs practice button - only show if not already tagged */}
                              {(!word.tags || !word.tags.includes(VOCAB_TAGS.NEEDS_PRACTICE)) && (
                                <button
                                  onClick={() => addTag.mutate({ lemma: word.lemma, language: session?.language as LangCode, tag: VOCAB_TAGS.NEEDS_PRACTICE })}
                                  disabled={addTag.isPending}
                                  className="group/btn flex items-center gap-1 p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded transition-colors"
                                  title="Mark as needs practice"
                                >
                                  <Plus className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                  <span className="text-[10px] text-yellow-600 dark:text-yellow-400 opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                    Practice
                                  </span>
                                </button>
                              )}
                              {/* Delete word button */}
                              <button
                                onClick={() => deleteWord.mutate({ lemma: word.lemma, language: session?.language as LangCode })}
                                disabled={deleteWord.isPending}
                                className="group/btn flex items-center gap-1 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Delete word"
                              >
                                <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                                <span className="text-[10px] text-red-600 dark:text-red-400 opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">
                                  Delete
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Show tag badge if word has tag */}
                        {word.tags && word.tags.length > 0 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                            word.tags[0] === VOCAB_TAGS.MASTERED
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : word.tags[0] === VOCAB_TAGS.NEEDS_PRACTICE
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {word.tags[0] === VOCAB_TAGS.MASTERED && 'Mastered'}
                            {word.tags[0] === VOCAB_TAGS.NEEDS_PRACTICE && 'Practice'}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Infinite scroll trigger */}
                {hasMore && (
                  <div ref={observerTarget} className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {/* End message */}
                {!hasMore && words.length > WORDS_PER_LOAD && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    All {words.length} words loaded
                  </div>
                )}
              </div>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                No vocabulary data available
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Stats */}
        <div className="col-span-1">
          <h3 className="text-xl font-bold text-foreground mb-4">Session Stats</h3>
          <Card className="divide-y divide-border">
            {session.duration !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Duration</span>
                </div>
                <span className="font-semibold text-foreground">{formatTime(session.duration)}</span>
              </div>
            )}

            {session.wordCount !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  <span>Total Words</span>
                </div>
                <span className="font-semibold text-foreground">{session.wordCount}</span>
              </div>
            )}

            {session.uniqueWordCount !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="w-4 h-4" />
                  <span>Unique Words</span>
                </div>
                <span className="font-semibold text-foreground">{session.uniqueWordCount}</span>
              </div>
            )}

            {session.wpm !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span>Words Per Minute</span>
                </div>
                <span className="font-semibold text-foreground">{Math.round(session.wpm)}</span>
              </div>
            )}

            {session.newWordCount !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  <span>New Words</span>
                </div>
                <span className="font-semibold text-green-600 dark:text-green-400">{session.newWordCount}</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed right-8 z-50 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all"
          style={{
            bottom: audioSrc ? '120px' : '32px' // Above audio player if present
          }}
          size="icon"
          title="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Session"
        description="Are you sure you want to delete this recording session? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        loading={deleteSession.isPending}
      />
    </div>
  );
}
