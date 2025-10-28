import { useParams, useNavigate } from 'react-router-dom';
import { useSession, useSessionWords, useDeleteSession } from '@/hooks/sessions';
import { Loader2, ArrowLeft, Trash2, Clock, MessageSquare, TrendingUp, BookOpen, Sparkles } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Card } from '@/components/ui/card';

export function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { data: session, isLoading: sessionLoading } = useSession(sessionId!);
  const { data: words, isLoading: wordsLoading } = useSessionWords(sessionId!);
  const deleteSession = useDeleteSession();

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

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      deleteSession.mutate(sessionId!, {
        onSuccess: () => {
          navigate('/history');
        },
      });
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session not found</h2>
          <p className="text-gray-600 mb-6">This session may have been deleted or doesn't exist.</p>
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
    console.log('Original audio path:', session.audioPath);
    console.log('Converted audio src:', audioSrc);
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Session History</span>
        </button>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Recording Session - {formatDate(session.startedAt)}
            </h1>
            <p className="text-gray-600">{getLanguageName(session.language)}</p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleteSession.isPending}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete session"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Audio Player */}
      {audioSrc && (
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-lg font-semibold text-gray-900 mb-2">Recording Audio</p>
              <audio controls className="w-full" src={audioSrc}>
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-8">
        {/* Left Column: Transcript + Words */}
        <div className="col-span-2 space-y-8">
          {/* Transcript */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Transcript</h3>
            {session.transcript ? (
              <Card className="p-6">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {session.transcript}
                </p>
              </Card>
            ) : (
              <Card className="p-6 text-center text-gray-500">
                No transcript available
              </Card>
            )}
          </div>

          {/* Vocabulary Words */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Vocabulary ({words?.length || 0} words)
            </h3>
            {wordsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : words && words.length > 0 ? (
              <Card className="divide-y">
                {words.map((word) => (
                  <div key={word.lemma} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium text-gray-900">{word.lemma}</span>
                      {word.isNew && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          <Sparkles className="w-3 h-3" />
                          New
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      Used {word.count} {word.count === 1 ? 'time' : 'times'}
                    </span>
                  </div>
                ))}
              </Card>
            ) : (
              <Card className="p-6 text-center text-gray-500">
                No vocabulary data available
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Stats */}
        <div className="col-span-1">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Session Stats</h3>
          <Card className="divide-y">
            {session.duration !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Duration</span>
                </div>
                <span className="font-semibold text-gray-900">{formatTime(session.duration)}</span>
              </div>
            )}

            {session.wordCount !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageSquare className="w-4 h-4" />
                  <span>Total Words</span>
                </div>
                <span className="font-semibold text-gray-900">{session.wordCount}</span>
              </div>
            )}

            {session.uniqueWordCount !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  <span>Unique Words</span>
                </div>
                <span className="font-semibold text-gray-900">{session.uniqueWordCount}</span>
              </div>
            )}

            {session.wpm !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>Words Per Minute</span>
                </div>
                <span className="font-semibold text-gray-900">{Math.round(session.wpm)}</span>
              </div>
            )}

            {session.newWordCount !== null && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Sparkles className="w-4 h-4" />
                  <span>New Words</span>
                </div>
                <span className="font-semibold text-green-600">{session.newWordCount}</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
