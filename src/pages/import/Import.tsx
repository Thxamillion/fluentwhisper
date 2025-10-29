import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreateTextLibraryItem } from '@/hooks/text-library';
import type { SourceType, DifficultyLevel } from '@/services/text-library';

export function Import() {
  const navigate = useNavigate();
  const createItem = useCreateTextLibraryItem();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    language: 'es',
    sourceType: 'manual' as SourceType,
    sourceUrl: '',
    difficultyLevel: '' as DifficultyLevel | '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please provide both a title and content');
      return;
    }

    try {
      await createItem.mutateAsync({
        title: formData.title,
        content: formData.content,
        language: formData.language,
        sourceType: formData.sourceType,
        sourceUrl: formData.sourceUrl || undefined,
        difficultyLevel: formData.difficultyLevel || undefined,
      });

      // Navigate back to library
      navigate('/library');
    } catch (error) {
      console.error('Failed to create text:', error);
      alert('Failed to create text. Please try again.');
    }
  };

  const wordCount = formData.content.trim().split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.ceil(wordCount / 150);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/library')} className="mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Library
      </Button>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Text Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
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

            {/* Language */}
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

            {/* Source Type */}
            <div className="space-y-2">
              <Label htmlFor="sourceType">Source Type</Label>
              <Select
                value={formData.sourceType}
                onValueChange={(value) =>
                  setFormData({ ...formData, sourceType: value as SourceType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="book">Book</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source URL (optional) */}
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Source URL (optional)</Label>
              <Input
                id="sourceUrl"
                type="url"
                placeholder="https://..."
                value={formData.sourceUrl}
                onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
              />
            </div>

            {/* Difficulty Level */}
            <div className="space-y-2">
              <Label htmlFor="difficultyLevel">Difficulty Level (optional)</Label>
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

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">
                Content <span className="text-red-500">*</span>
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

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4">
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
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
