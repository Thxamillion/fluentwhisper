import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Upload, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreateTextLibraryItem } from '@/hooks/text-library';
import type { SourceType, DifficultyLevel } from '@/services/text-library';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from '@/lib/toast';

export function Import() {
  const navigate = useNavigate();
  const createItem = useCreateTextLibraryItem();

  const [sourceType, setSourceType] = useState<SourceType>('manual');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    language: 'es',
    sourceUrl: '',
    difficultyLevel: '' as DifficultyLevel | '',
  });

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }]
      });

      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected);
        setFormData({ ...formData, content });
        toast.success('File loaded successfully');
      }
    } catch (error) {
      console.error('Failed to read file:', error);
      toast.error('Failed to read file. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please provide both a title and content');
      return;
    }

    try {
      await createItem.mutateAsync({
        title: formData.title,
        content: formData.content,
        language: formData.language,
        sourceType: sourceType,
        sourceUrl: formData.sourceUrl || undefined,
        difficultyLevel: formData.difficultyLevel || undefined,
      });

      toast.success('Text added to library!');
      navigate('/library');
    } catch (error) {
      console.error('Failed to create text:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to create text: ${errorMessage}`);
    }
  };

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.ceil(wordCount / 150);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source Type - Prominent */}
        <div className="space-y-3">
          <Label className="text-lg font-semibold">How do you want to import text?</Label>
          <Select value={sourceType} onValueChange={(value) => setSourceType(value as SourceType)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual Entry - Paste text directly</SelectItem>
              <SelectItem value="text_file">Text File - Upload a .txt file</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Content Area */}
        <Card>
          <CardContent className="pt-6">
            {sourceType === 'text_file' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Text Content</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFileSelect}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <Textarea
                  placeholder="File content will appear here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                  required
                />
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{wordCount} words</span>
                  </div>
                  <span>•</span>
                  <span>~{estimatedMinutes} min read</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="content">
                  Text Content <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="content"
                  placeholder="Paste your text here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                  required
                />
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{wordCount} words</span>
                  </div>
                  <span>•</span>
                  <span>~{estimatedMinutes} min read</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Title and Language - Side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., El Principito - Chapter 1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">
              Language <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData({ ...formData, language: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Optional Fields - Collapsible */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`} />
            <span>Advanced options (optional)</span>
          </button>

          {showOptionalFields && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">Source URL</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  placeholder="https://..."
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficultyLevel">Difficulty Level</Label>
                <Select
                  value={formData.difficultyLevel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, difficultyLevel: value as DifficultyLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={createItem.isPending} className="flex-1">
            {createItem.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add to Library'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/library')}
            disabled={createItem.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
