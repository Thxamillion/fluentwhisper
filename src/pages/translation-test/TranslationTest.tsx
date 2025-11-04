import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card } from '@/components/ui/card';

interface TranslationResult {
  lemma_from: string;
  translation: string;
  lang_from: string;
  lang_to: string;
}

export function TranslationTest() {
  const [word, setWord] = useState('');
  const [langFrom, setLangFrom] = useState('en');
  const [langTo, setLangTo] = useState('es');
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testWords = {
    en: ['cat', 'dog', 'hello', 'house', 'water', 'food', 'yes', 'no', 'good', 'bad', 'tree', 'sun'],
    es: ['gato', 'perro', 'hola', 'casa', 'agua', 'comida', 'sí', 'no', 'bueno', 'malo', 'árbol', 'sol']
  };

  const searchTranslation = async (searchWord: string) => {
    setLoading(true);
    setError(null);

    try {
      // Use existing get_translation command
      const translation: string | null = await invoke('get_translation', {
        lemma: searchWord.toLowerCase(),
        fromLang: langFrom,
        toLang: langTo
      });

      if (translation) {
        setResults([{
          lemma_from: searchWord.toLowerCase(),
          translation,
          lang_from: langFrom,
          lang_to: langTo
        }]);
      } else {
        setResults([]);
        setError(`No translation found for "${searchWord}" (${langFrom}→${langTo})`);
      }
    } catch (err) {
      setError(`Error: ${err}`);
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const testAllWords = async () => {
    setLoading(true);
    setError(null);
    const allResults: TranslationResult[] = [];

    const wordsToTest = testWords[langFrom as keyof typeof testWords];

    for (const testWord of wordsToTest) {
      try {
        const translation: string | null = await invoke('get_translation', {
          lemma: testWord.toLowerCase(),
          fromLang: langFrom,
          toLang: langTo
        });

        if (translation) {
          allResults.push({
            lemma_from: testWord.toLowerCase(),
            translation,
            lang_from: langFrom,
            lang_to: langTo
          });
        }
      } catch (err) {
        console.error(`Error testing ${testWord}:`, err);
      }
    }

    setResults(allResults);
    setLoading(false);

    if (allResults.length === 0) {
      setError(`No translations found for any test words (${langFrom}→${langTo})`);
    } else {
      const found = allResults.length;
      const total = wordsToTest.length;
      const percentage = Math.round((found / total) * 100);
      setError(`Found ${found}/${total} translations (${percentage}% coverage)`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Translation Database Test</h1>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Query Translation Database</h2>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From</label>
              <select
                className="p-2 border rounded"
                value={langFrom}
                onChange={(e) => setLangFrom(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">To</label>
              <select
                className="p-2 border rounded"
                value={langTo}
                onChange={(e) => setLangTo(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter word to translate..."
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchTranslation(word)}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={() => searchTranslation(word)}
              disabled={loading || !word}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <button
            onClick={testAllWords}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : `Test Common ${langFrom.toUpperCase()} Words`}
          </button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Results ({results.length} translations found)
          </h2>

          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{result.lemma_from}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-blue-600">{result.translation}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {result.lang_from} → {result.lang_to}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
