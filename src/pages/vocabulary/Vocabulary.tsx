import { useState, useMemo, useEffect } from 'react';
import { useUserVocab } from '@/hooks/vocabulary';
import { Loader2, Search, BookOpen, ChevronLeft, ChevronRight, MoreVertical, Trash2, Edit } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore } from '@/stores/settingsStore';
import { VOCAB_TAGS } from '@/services/vocabulary/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/toast';
import { DictionaryButton } from '@/components/dictionary';

export function Vocabulary() {
  const { settings } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMastered, setFilterMastered] = useState<'all' | 'mastered' | 'needs-practice' | 'learning'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [customTranslations, setCustomTranslations] = useState<Record<string, string>>({});
  const [loadingTranslations, setLoadingTranslations] = useState(false);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{ lemma: string; language: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline editing state
  const [editingWordId, setEditingWordId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Always show target language (language you're learning)
  const { data: vocab, isLoading, refetch: refetchVocab } = useUserVocab(settings.targetLanguage as any);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      de: 'German',
    };
    return names[code] || code;
  };

  // Filter and search vocabulary
  const filteredVocab = useMemo(() => {
    if (!vocab) return [];

    return vocab.filter((word) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        word.lemma.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.forms_spoken.some((form) => form.toLowerCase().includes(searchQuery.toLowerCase()));

      // Tag-based filter
      const matchesMastered =
        filterMastered === 'all' ||
        (filterMastered === 'mastered' && word.tags?.includes(VOCAB_TAGS.MASTERED)) ||
        (filterMastered === 'needs-practice' && word.tags?.includes(VOCAB_TAGS.NEEDS_PRACTICE)) ||
        (filterMastered === 'learning' && (!word.tags || word.tags.length === 0));

      return matchesSearch && matchesMastered;
    });
  }, [vocab, searchQuery, filterMastered]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredVocab.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVocab = filteredVocab.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilter: 'all' | 'mastered' | 'needs-practice' | 'learning') => {
    setFilterMastered(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // Delete word handlers
  const handleDeleteClick = (lemma: string, language: string) => {
    setSelectedWord({ lemma, language });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedWord) return;

    setIsDeleting(true);
    try {
      await invoke('delete_vocab_word', {
        lemma: selectedWord.lemma,
        language: selectedWord.language,
      });

      // Refetch vocabulary to update UI
      refetchVocab();

      // Close dialog
      setDeleteDialogOpen(false);
      setSelectedWord(null);
      toast.success('Word deleted from vocabulary');
    } catch (error) {
      console.error('Failed to delete word:', error);
      toast.error(`Failed to delete word: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Custom translation edit handlers
  const handleEditClick = (wordId: number, currentTranslation: string) => {
    setEditingWordId(wordId);
    setEditValue(currentTranslation || '');
  };

  const handleEditSave = async (lemma: string, language: string) => {
    if (!editValue.trim()) return;

    setIsSaving(true);
    try {
      await invoke('set_custom_translation', {
        lemma,
        langFrom: language,
        langTo: settings.primaryLanguage,
        customTranslation: editValue.trim(),
        notes: null,
      });

      // Update local translations state
      setCustomTranslations((prev) => ({
        ...prev,
        [lemma]: editValue.trim(),
      }));

      // Exit edit mode
      setEditingWordId(null);
      setEditValue('');
      toast.success('Custom translation saved');
    } catch (error) {
      console.error('Failed to save translation:', error);
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingWordId(null);
    setEditValue('');
  };

  // Fetch custom translations for visible words
  useEffect(() => {
    const fetchCustomTranslations = async () => {
      if (!filteredVocab || filteredVocab.length === 0) return;

      setLoadingTranslations(true);

      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const pageWords = filteredVocab.slice(startIdx, endIdx);

      const translationsMap: Record<string, string> = {};

      for (const word of pageWords) {
        try {
          // Only fetch custom translations (user-created ones)
          const result = await invoke<string | null>('get_custom_translation', {
            lemma: word.lemma,
            langFrom: word.language,
            langTo: settings.primaryLanguage,
          });

          if (result) {
            translationsMap[word.lemma] = result;
          }
        } catch (error) {
          // Silently ignore - just means no custom translation exists
        }
      }

      setCustomTranslations((prev) => ({ ...prev, ...translationsMap }));
      setLoadingTranslations(false);
    };

    fetchCustomTranslations();
  }, [currentPage, itemsPerPage, filteredVocab, settings.primaryLanguage]);

  return (
    <div className="p-8">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-8">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search vocabulary..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tag filter */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleFilterChange('all')}
            variant={filterMastered === 'all' ? 'default' : 'secondary'}
          >
            All
          </Button>
          <Button
            onClick={() => handleFilterChange('needs-practice')}
            variant={filterMastered === 'needs-practice' ? 'default' : 'secondary'}
          >
            Needs Practice
          </Button>
          <Button
            onClick={() => handleFilterChange('mastered')}
            variant={filterMastered === 'mastered' ? 'default' : 'secondary'}
          >
            Mastered
          </Button>
          <Button
            onClick={() => handleFilterChange('learning')}
            variant={filterMastered === 'learning' ? 'default' : 'secondary'}
          >
            Learning
          </Button>
        </div>
      </div>

      {/* Vocabulary List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredVocab.length > 0 ? (
        <>
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Word</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Dictionary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Forms Used</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Usage</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">First Seen</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-foreground w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedVocab.map((word) => (
                  <tr key={word.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{word.lemma}</span>
                        {word.tags && word.tags.length > 0 && (
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
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
                    </td>
                    <td className="px-4 py-3 text-card-foreground">
                      {loadingTranslations ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : editingWordId === word.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleEditSave(word.lemma, word.language);
                              }
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                            autoFocus
                            disabled={isSaving}
                            placeholder="Enter translation..."
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEditSave(word.lemma, word.language)}
                            disabled={isSaving || !editValue.trim()}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditCancel}
                            disabled={isSaving}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : customTranslations[word.lemma] ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(word.id, customTranslations[word.lemma])}
                            className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
                          >
                            <span>{customTranslations[word.lemma]}</span>
                            <Edit className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <DictionaryButton word={word.lemma} language={word.language} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(word.id, '')}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Add translation
                          </button>
                          <DictionaryButton word={word.lemma} language={word.language} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {word.forms_spoken.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {word.forms_spoken.map((form, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
                            >
                              {form}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span className="font-medium">{word.usage_count}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(word.first_seen_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-muted rounded transition-colors">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(word.lemma, word.language)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Word
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="mt-6 flex items-center justify-between">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
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
              <span className="text-sm text-muted-foreground">per page</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredVocab.length)} of {filteredVocab.length} words
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="secondary"
                size="icon"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1">
                {/* Show page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first page, last page, current page, and pages around current
                    return (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    );
                  })
                  .map((page, index, array) => (
                    <div key={page} className="flex items-center">
                      {/* Show ellipsis if there's a gap */}
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        onClick={() => setCurrentPage(page)}
                        variant={currentPage === page ? 'default' : 'ghost'}
                        size="sm"
                      >
                        {page}
                      </Button>
                    </div>
                  ))}
              </div>

              <Button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                variant="secondary"
                size="icon"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery || filterMastered !== 'all' ? 'No words found' : 'No vocabulary yet'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery || filterMastered !== 'all'
              ? 'Try adjusting your search or filters'
              : `Start recording sessions in ${getLanguageName(settings.targetLanguage)} to build your vocabulary!`}
          </p>
        </div>
      )}

      {/* Delete Word Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Word</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedWord?.lemma}" from your vocabulary? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
