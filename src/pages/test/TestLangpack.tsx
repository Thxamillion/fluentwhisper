import { useState, useEffect } from 'react';
import { useProcessWords } from '@/hooks/langpack';
import { useVocabStats, useRecordWord } from '@/hooks/vocabulary';
import { tokenize } from '@/services/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

/**
 * Test page to verify language pack integration works end-to-end
 * Now with vocabulary saving!
 */
export function TestLangpack() {
  const [inputText, setInputText] = useState('estoy corriendo del parque');
  const [words, setWords] = useState<string[]>([]);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  // Use the processWords hook
  const { data, isLoading, error } = useProcessWords(
    words,
    'es',
    'en',
    words.length > 0
  );

  // Get vocabulary stats
  const { data: stats, refetch: refetchStats } = useVocabStats('es', true);

  // Mutation for saving words
  const { mutateAsync: recordWord } = useRecordWord();

  // Auto-save words when results come in
  useEffect(() => {
    if (data && data.length > 0) {
      const saveWords = async () => {
        const newlySaved = new Set<string>();

        for (const result of data) {
          if (result.lemma && !savedWords.has(result.lemma)) {
            try {
              await recordWord({
                lemma: result.lemma,
                language: 'es',
                formSpoken: result.word,
              });
              newlySaved.add(result.lemma);
            } catch (err) {
              console.error('Failed to save word:', result.lemma, err);
            }
          }
        }

        if (newlySaved.size > 0) {
          setSavedWords(prev => new Set([...prev, ...newlySaved]));
          refetchStats();
        }
      };

      saveWords();
    }
  }, [data, recordWord, savedWords, refetchStats]);

  const handleProcess = () => {
    // Use proper tokenization service with Spanish language rules
    const tokens = tokenize(inputText, 'es');
    setWords(tokens);
    setSavedWords(new Set()); // Reset for new batch
  };

  const handleClear = () => {
    setWords([]);
    setInputText('');
    setSavedWords(new Set());
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Language Pack Test</h1>

        {stats && (
          <Card className="p-4">
            <div className="text-sm space-y-1">
              <p className="font-semibold">Vocabulary Stats</p>
              <p className="text-gray-600">Total words: {stats.total_words}</p>
              <p className="text-gray-600">This week: {stats.words_this_week}</p>
            </div>
          </Card>
        )}
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Input</h2>

        <div className="flex gap-4 mb-4">
          <Input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter Spanish text (e.g., estoy corriendo del parque)"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputText.trim()) {
                handleProcess();
              }
            }}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleProcess} disabled={!inputText.trim()}>
            Process & Save Words
          </Button>
          <Button onClick={handleClear} variant="outline">
            Clear
          </Button>
        </div>

        <p className="text-sm text-gray-500 mt-2">
          Words will be automatically saved to your vocabulary
        </p>
      </Card>

      {isLoading && (
        <Card className="p-6">
          <p className="text-gray-500">Processing...</p>
        </Card>
      )}

      {error && (
        <Card className="p-6 border-red-500">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-red-500">{error.message}</p>
        </Card>
      )}

      {data && data.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Results</h2>
            <span className="text-sm text-green-600 font-medium">
              ✓ Saved to vocabulary
            </span>
          </div>

          <div className="space-y-4">
            {data.map((result, index) => {
              const wasSaved = savedWords.has(result.lemma);

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    wasSaved ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Word</p>
                      <p className="text-lg font-semibold">{result.word}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Lemma</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold">{result.lemma}</p>
                        {wasSaved && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Translation</p>
                      <p className="text-lg font-semibold">
                        {result.translation || '(not found)'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-gray-500">
              Processed {data.length} word{data.length !== 1 ? 's' : ''}
              {savedWords.size > 0 && ` • ${savedWords.size} new word${savedWords.size !== 1 ? 's' : ''} saved`}
            </p>
          </div>
        </Card>
      )}

      {data && data.length === 0 && words.length > 0 && (
        <Card className="p-6">
          <p className="text-gray-500">No results found.</p>
        </Card>
      )}
    </div>
  );
}
