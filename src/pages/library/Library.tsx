import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Search, Plus, FileText, BookOpen, Clock, Trash2, Play, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTextLibrary, useDeleteTextLibraryItem } from '@/hooks/text-library';
import type { TextLibraryItem } from '@/services/text-library';
import { toast } from '@/lib/toast';

// Helper function to format duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds}s`;
}

const sourceIcons = {
  manual: FileText,
  text_file: Upload,
  book: BookOpen,
  article: FileText,
};

export function Library() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { data: textItems = [], isLoading } = useTextLibrary();
  const deleteItem = useDeleteTextLibraryItem();

  // Filter items based on search and language
  const filteredItems = textItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = selectedLanguage === 'all' || item.language === selectedLanguage;
    return matchesSearch && matchesLanguage;
  });

  // Get unique languages from items
  const languages = Array.from(new Set(textItems.map((item) => item.language)));

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteItem.mutateAsync(itemToDelete);
      toast.success('Text deleted successfully');
    } catch (error) {
      console.error('Failed to delete text item:', error);
      toast.error('Failed to delete text');
    } finally {
      setItemToDelete(null);
    }
  };

  const handleReadAloud = (item: TextLibraryItem) => {
    navigate(`/read-aloud/${item.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4 flex-wrap gap-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search library..."
              className="pl-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => navigate('/import')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Text
          </Button>

          {/* Language Filter */}
          <div className="flex items-center gap-2 ml-4 border-l pl-4">
            <Button
              variant={selectedLanguage === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLanguage('all')}
            >
              All
            </Button>
            {languages.map((lang) => (
              <Button
                key={lang}
                variant={selectedLanguage === lang ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLanguage(lang)}
              >
                {lang.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Text Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No texts found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Start by importing your first text'}
          </p>
          <Button onClick={() => navigate('/import')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Text
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const Icon = sourceIcons[item.sourceType] || FileText;
            const duration = item.estimatedDuration || 0;

            return (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
                onClick={() => handleReadAloud(item)}
              >
                <CardContent className="p-6">
                  {/* Header with icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">
                          {new Date(item.createdAt * 1000).toLocaleDateString()}
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Content preview */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {item.content}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{item.wordCount || 0} words</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDuration(duration)}</span>
                    </div>
                    <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      {item.language.toUpperCase()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReadAloud(item);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Read Aloud
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Text"
        description="Are you sure you want to delete this text? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        loading={deleteItem.isPending}
      />
    </div>
  );
}
