import { useState, useMemo } from 'react';
import { TranslationTooltip } from './TranslationTooltip';
import { getLemma, getTranslation } from '@/services/langpack';
import type { VocabWord } from '@/services/vocabulary';

interface HighlightedTextProps {
  text: string;
  language: string;
  userVocab: VocabWord[];
}

interface Token {
  type: 'word' | 'space' | 'punctuation';
  text: string;
  index: number;
}

interface SelectedWord {
  word: string;
  lemma: string;
  translation: string;
  position: { x: number; y: number };
}

export function HighlightedText({ text, language, userVocab }: HighlightedTextProps) {
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);

  // Create a Set of known lemmas for fast lookup
  const knownLemmas = useMemo(() => {
    return new Set(userVocab.map((v) => v.lemma.toLowerCase()));
  }, [userVocab]);

  // Tokenize text while preserving whitespace and punctuation
  const tokens = useMemo((): Token[] => {
    const result: Token[] = [];
    let currentIndex = 0;

    // Match words (including accented characters), spaces, and punctuation
    // \p{L} matches any Unicode letter (including á, é, í, ó, ú, ñ, etc.)
    // \p{N} matches any Unicode number
    const regex = /([\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)?)|(\s+)|([^\p{L}\p{N}\s]+)/gu;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, word, space, punct] = match;

      if (word) {
        result.push({ type: 'word', text: word, index: currentIndex });
      } else if (space) {
        result.push({ type: 'space', text: space, index: currentIndex });
      } else if (punct) {
        result.push({ type: 'punctuation', text: punct, index: currentIndex });
      }

      currentIndex++;
    }

    return result;
  }, [text]);

  const handleWordClick = async (word: string, event: React.MouseEvent) => {
    // Prevent any default behavior
    event.preventDefault();
    event.stopPropagation();

    // Close any existing tooltip first
    setSelectedWord(null);
    setLoadingTranslation(true);

    try {
      // Get lemma with timeout
      let lemma = word.toLowerCase();
      try {
        const lemmaResult = await Promise.race([
          getLemma(word.toLowerCase(), language as any),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Lemma timeout')), 3000)
          ),
        ]);
        // Extract the data field from ServiceResult
        if (lemmaResult && typeof lemmaResult === 'object' && 'data' in lemmaResult) {
          if (lemmaResult.success && lemmaResult.data) {
            lemma = String(lemmaResult.data);
          }
        }
      } catch (error) {
        console.warn('Failed to get lemma:', error);
        // Continue with original word as lemma
      }

      // Get translation with timeout
      let translation = 'Translation not available';
      try {
        const targetLang = 'en';
        const translationResult = await Promise.race([
          getTranslation(lemma, language as any, targetLang),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Translation timeout')), 3000)
          ),
        ]);
        // Extract the data field from ServiceResult
        if (translationResult && typeof translationResult === 'object' && 'data' in translationResult) {
          if (translationResult.success && translationResult.data) {
            translation = String(translationResult.data);
          }
        }
      } catch (error) {
        console.warn('Failed to get translation:', error);
        // Continue with fallback translation
      }

      // Get click position for tooltip - ensure it's within viewport
      const rect = (event.target as HTMLElement).getBoundingClientRect();

      // Calculate position ensuring tooltip stays in viewport
      let x = rect.left;
      let y = rect.bottom + 8;

      // Adjust if too far right (tooltip is 288px wide)
      if (x + 288 > window.innerWidth) {
        x = window.innerWidth - 288 - 16; // 16px margin
      }

      // Adjust if too far down (tooltip is ~200px tall)
      if (y + 200 > window.innerHeight) {
        y = rect.top - 208; // Show above the word instead
      }

      // Ensure minimum margins
      x = Math.max(16, x);
      y = Math.max(16, y);

      // Validate all values before setting state
      if (
        !word ||
        !lemma ||
        !translation ||
        !isFinite(x) ||
        !isFinite(y) ||
        x < 0 ||
        y < 0
      ) {
        console.error('Invalid tooltip data:', { word, lemma, translation, x, y });
        setLoadingTranslation(false);
        return;
      }

      console.log('Setting tooltip position:', { x, y, word, lemma, translation });

      // Use a small delay to ensure state is clean
      setTimeout(() => {
        setSelectedWord({
          word: String(word),
          lemma: String(lemma),
          translation: String(translation),
          position: { x: Number(x), y: Number(y) },
        });
      }, 0);
    } catch (error) {
      console.error('Error in handleWordClick:', error);
      // Reset state on error
      setSelectedWord(null);
    } finally {
      setLoadingTranslation(false);
    }
  };

  const closeTooltip = () => {
    setSelectedWord(null);
  };

  return (
    <>
      <div className="text-lg leading-relaxed">
        {tokens.map((token, index) => {
          if (token.type === 'word') {
            const lemma = token.text.toLowerCase();
            const isKnown = knownLemmas.has(lemma);

            return (
              <span
                key={index}
                className={`
                  ${!isKnown ? 'bg-yellow-200 dark:bg-yellow-900/40 px-1 rounded cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-900/60 transition-colors' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-0.5 rounded transition-colors'}
                  ${loadingTranslation ? 'opacity-50' : ''}
                `}
                onClick={(e) => handleWordClick(token.text, e)}
                title={!isKnown ? 'New word - Click for translation' : 'Click for translation'}
              >
                {token.text}
              </span>
            );
          } else if (token.type === 'space') {
            return <span key={index}>{token.text}</span>;
          } else {
            // Punctuation
            return (
              <span key={index} className="text-gray-600 dark:text-gray-400">
                {token.text}
              </span>
            );
          }
        })}
      </div>

      {/* Translation Tooltip */}
      {selectedWord && !loadingTranslation && (
        <TranslationTooltip
          word={selectedWord.word}
          lemma={selectedWord.lemma}
          translation={selectedWord.translation}
          position={selectedWord.position}
          onClose={closeTooltip}
        />
      )}
    </>
  );
}
