import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllSessions, useDeleteSession } from '@/hooks/sessions';
import { Loader2, Trash2, Clock, MessageSquare, TrendingUp, Languages } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function History() {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const { data: sessions, isLoading } = useAllSessions();
  const deleteSession = useDeleteSession();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (window.confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      deleteSession.mutate(sessionId);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  // Filter sessions by language
  const filteredSessions = sessions?.filter(
    (session) => selectedLanguage === 'all' || session.language === selectedLanguage
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Session History</h1>
        <p className="text-gray-600">Review your past recording sessions and track your progress over time.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-8">
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="fr">French</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredSessions && filteredSessions.length > 0 ? (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card
              key={session.id}
              onClick={() => handleSessionClick(session.id)}
              className="p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {session.language === 'es' ? 'Spanish' : session.language === 'en' ? 'English' : 'French'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(session.startedAt)}</div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 mb-4">
                    {session.duration && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(session.duration)}</span>
                      </div>
                    )}
                    {session.wordCount !== null && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MessageSquare className="w-4 h-4" />
                        <span>{session.wordCount} words</span>
                      </div>
                    )}
                    {session.uniqueWordCount !== null && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{session.uniqueWordCount}</span> unique
                      </div>
                    )}
                    {session.wpm !== null && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4" />
                        <span>{Math.round(session.wpm)} WPM</span>
                      </div>
                    )}
                    {session.newWordCount !== null && session.newWordCount > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        +{session.newWordCount} new words
                      </div>
                    )}
                  </div>

                  {/* Transcript Preview */}
                  {session.transcript && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-sm text-gray-700 line-clamp-3">{session.transcript}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  disabled={deleteSession.isPending}
                  className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete session"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
          <p className="text-gray-600 mb-6">
            {selectedLanguage === 'all'
              ? 'Start recording to create your first session!'
              : `No sessions found for ${selectedLanguage === 'es' ? 'Spanish' : selectedLanguage === 'en' ? 'English' : 'French'}. Try switching languages or start recording!`}
          </p>
        </Card>
      )}
    </div>
  );
}
