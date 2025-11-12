/**
 * DictionaryViewer - Shows external dictionaries in tabs with iframe
 * Simple implementation inspired by Lute-v3
 */

import { useState, useEffect } from 'react';
import { useDictionaries } from '@/hooks/dictionaries';
import { buildLookupUrl } from '@/services/dictionaries';
import { Loader2, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DictionaryViewerProps {
  word: string;
  language: string;
  onClose: () => void;
}

export function DictionaryViewer({ word, language, onClose }: DictionaryViewerProps) {
  const { data: allDictionaries, isLoading } = useDictionaries(language);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Filter to only active dictionaries and sort by sort_order
  const activeDictionaries = allDictionaries
    ?.filter((d) => d.is_active === 1)
    .sort((a, b) => a.sort_order - b.sort_order) || [];

  // Set first active dictionary as default when dictionaries load
  useEffect(() => {
    if (activeDictionaries.length > 0 && activeTab === 0) {
      setActiveTab(0);
    }
  }, [activeDictionaries.length]);

  const currentDict = activeDictionaries[activeTab];

  const handleExternalOpen = () => {
    if (!currentDict) return;
    const url = buildLookupUrl(currentDict.url_template, word);
    window.open(url, '_blank', 'width=800,height=600');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!activeDictionaries || activeDictionaries.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No active dictionaries configured for this language.</p>
        <p className="text-sm mt-2">Go to Settings to configure dictionaries.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs and close button */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {activeDictionaries.map((dict, index) => (
            <button
              key={dict.id}
              onClick={() => setActiveTab(index)}
              className={`px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap ${
                activeTab === index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {dict.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {currentDict?.dict_type === 'embedded' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExternalOpen}
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dictionary content */}
      <div className="flex-1 relative">
        {currentDict?.dict_type === 'embedded' ? (
          <iframe
            key={currentDict.id}
            src={buildLookupUrl(currentDict.url_template, word)}
            className="w-full h-full border-0"
            title={`${currentDict.name} - ${word}`}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : currentDict?.dict_type === 'popup' ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
            <p className="text-muted-foreground">
              This dictionary opens in a new window.
            </p>
            <Button onClick={handleExternalOpen}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open {currentDict.name}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
