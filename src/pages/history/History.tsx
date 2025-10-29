import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllSessions, useDeleteSession } from '@/hooks/sessions';
import { Loader2, Trash2, Clock, MessageSquare, TrendingUp, Languages, BookOpen, Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function History() {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedSessionType, setSelectedSessionType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
    e.stopPropagation();
    console.log('Delete button clicked for session:', sessionId);

    // TEMPORARY: Bypassing confirmation because window.confirm() doesn't work in Tauri
    // TODO: Implement a proper React confirmation dialog component
    console.log('Proceeding with delete (confirmation disabled for testing)');

    try {
      console.log('Calling deleteSession.mutateAsync');
      await deleteSession.mutateAsync(sessionId);
      console.log('Session deleted successfully');

      // Reset to page 1 after delete to avoid pagination issues
      if (paginatedSessions.length === 1 && currentPage > 1) {
        console.log('Last item on page deleted, going to previous page');
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  // Filter sessions by language and session type
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    return sessions.filter((session) => {
      const languageMatch = selectedLanguage === 'all' || session.language === selectedLanguage;
      const sessionTypeMatch =
        selectedSessionType === 'all' ||
        (session.sessionType || 'free_speak') === selectedSessionType;
      return languageMatch && sessionTypeMatch;
    });
  }, [sessions, selectedLanguage, selectedSessionType]);

  // Pagination calculations with safety checks
  const totalPages = filteredSessions.length > 0 ? Math.ceil(filteredSessions.length / itemsPerPage) : 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  // Adjust current page if it's out of bounds after deletion
  useEffect(() => {
    if (filteredSessions.length > 0 && currentPage > totalPages) {
      console.log('Current page out of bounds, adjusting to:', totalPages);
      setCurrentPage(totalPages);
    } else if (filteredSessions.length === 0 && currentPage !== 1) {
      console.log('No sessions, resetting to page 1');
      setCurrentPage(1);
    }
  }, [filteredSessions.length, currentPage, totalPages]);

  // Reset to page 1 when filters change
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setCurrentPage(1);
  };

  const handleSessionTypeChange = (sessionType: string) => {
    setSelectedSessionType(sessionType);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  return (
    <div className="p-8">
      {/* Filters */}
      <div className="flex items-center space-x-4 mb-8">
        <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
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

        <Select value={selectedSessionType} onValueChange={handleSessionTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Session Types</SelectItem>
            <SelectItem value="free_speak">Free Speak</SelectItem>
            <SelectItem value="read_aloud">Read Aloud</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredSessions.length > 0 ? (
        <>
          <div className="space-y-4">
            {paginatedSessions.map((session) => (
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

                    {/* Session Type Badge */}
                    {(session.sessionType || 'free_speak') === 'read_aloud' ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                        <BookOpen className="w-3 h-3" />
                        Read Aloud
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                        <Mic className="w-3 h-3" />
                        Free Speak
                      </span>
                    )}

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

          {/* Pagination Controls */}
          {totalPages > 0 && (
            <div className="mt-6 flex items-center justify-between">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <Select value={String(itemsPerPage)} onValueChange={(value) => handleItemsPerPageChange(Number(value))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">per page</span>
              </div>

              {/* Page info */}
              <div className="text-sm text-gray-600">
                Showing {Math.min(startIndex + 1, filteredSessions.length)}-{Math.min(endIndex, filteredSessions.length)} of {filteredSessions.length} sessions
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  variant="secondary"
                  size="icon"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {/* Show page numbers */}
                  {totalPages > 0 && Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= safePage - 1 && page <= safePage + 1)
                      );
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {/* Show ellipsis if there's a gap */}
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-gray-400">...</span>
                        )}
                        <Button
                          onClick={() => setCurrentPage(page)}
                          variant={safePage === page ? 'default' : 'ghost'}
                          size="sm"
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>

                <Button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages || totalPages === 0}
                  variant="secondary"
                  size="icon"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
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
