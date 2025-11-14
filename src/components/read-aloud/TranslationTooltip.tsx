import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';

interface TranslationTooltipProps {
  word: string;
  lemma: string;
  translation: string | null;
  position: { x: number; y: number };
  onClose: () => void;
  onMarkKnown?: () => void;
}

export function TranslationTooltip({
  word,
  lemma,
  translation,
  position,
  onClose,
  onMarkKnown,
}: TranslationTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Close on Escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Validate all required props
  if (!word || !lemma) {
    console.error('Invalid tooltip data - missing text:', { word, lemma, translation });
    return null;
  }

  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    console.error('Invalid tooltip position:', position);
    return null;
  }

  if (!isFinite(position.x) || !isFinite(position.y)) {
    console.error('Invalid tooltip position - not finite:', position);
    return null;
  }

  // Adjust position to stay within viewport
  const adjustedPosition = {
    x: Math.max(16, Math.min(position.x, window.innerWidth - 320)),
    y: Math.max(16, Math.min(position.y, window.innerHeight - 250)),
  };

  // Final validation
  if (!isFinite(adjustedPosition.x) || !isFinite(adjustedPosition.y)) {
    console.error('Invalid adjusted position:', adjustedPosition);
    return null;
  }

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <Card className="w-72 shadow-xl border-2">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">{word}</h3>
              {lemma !== word.toLowerCase() && (
                <p className="text-xs text-muted-foreground">
                  Base form: <span className="font-medium">{lemma}</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Translation or Dictionary Hint */}
          <div className="mb-4">
            <div className="text-sm text-muted-foreground mb-1">Translation:</div>
            {translation ? (
              <div className="text-base font-medium text-blue-600 dark:text-blue-400">
                {translation}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                Use the dictionary button in vocabulary to look up this word
              </div>
            )}
          </div>

          {/* Actions */}
          {onMarkKnown && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onMarkKnown}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark as Known
              </Button>
            </div>
          )}

          {/* Tip */}
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            💡 Click outside or press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">Esc</kbd> to close
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
