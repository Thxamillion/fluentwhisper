import { useState, useMemo } from 'react';
import { TranslationTooltip } from './TranslationTooltip';
import { getLemma } from '@/services/langpack';
import { getCustomTranslation } from '@/services/vocabulary';
import type { VocabWord, LangCode } from '@/services/vocabulary';
import { logger } from '@/services/logger'

interface HighlightedTextProps {
  text: string;
  language: string;
  primaryLanguage: string;
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
  translation: string | null;
  position: { x: number; y: number };
}

export function HighlightedText({ text, language, primaryLanguage, userVocab }: HighlightedTextProps) {
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);

  // Create a Set of known lemmas AND all forms_spoken for fast lookup
  const knownLemmas = useMemo(() => {
    const knownSet = new Set<string>();

    userVocab.forEach((v) => {
      // Add the lemma itself
      knownSet.add(v.lemma.toLowerCase());

      // Add all forms from forms_spoken
      v.forms_spoken.forEach((form) => {
        knownSet.add(form.toLowerCase());
      });
    });

    return knownSet;
  }, [userVocab]);

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

      // Fetch custom translation if it exists
      let translation: string | null = null;
      try {
        const translationResult = await getCustomTranslation(
          lemma,
          language as LangCode,
          primaryLanguage as LangCode
        );
        if (translationResult.success && translationResult.data) {
          translation = translationResult.data;
        }
      } catch (error) {
        console.warn('Failed to get custom translation:', error);
        // Continue with no translation
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
        !isFinite(x) ||
        !isFinite(y) ||
        x < 0 ||
        y < 0
      ) {
        console.error('Invalid tooltip data:', { word, lemma, translation, x, y });
        setLoadingTranslation(false);
        return;
      }

      logger.debug('Setting tooltip position', undefined, { x, y, word, lemma, translation });

      // Use a small delay to ensure state is clean
      setTimeout(() => {
        setSelectedWord({
          word: String(word),
          lemma: String(lemma),
          translation: translation,
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

  // Split text into paragraphs for proper rendering with spacing
  const paragraphs = useMemo(() => {
    return text.split('\n\n').filter(p => p.trim());
  }, [text]);

  return (
    <>
      <div className="text-lg leading-relaxed space-y-4">
        {paragraphs.map((paragraph, paraIndex) => {
          // Tokenize this paragraph only
          const paraTokens: Token[] = [];
          let currentIndex = 0;
          const regex = /([\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)?)|(\s+)|([^\p{L}\p{N}\s]+)/gu;
          let match;

          while ((match = regex.exec(paragraph)) !== null) {
            const [fullMatch, word, space, punct] = match;
            if (word) {
              paraTokens.push({ type: 'word', text: word, index: currentIndex });
            } else if (space) {
              paraTokens.push({ type: 'space', text: space, index: currentIndex });
            } else if (punct) {
              paraTokens.push({ type: 'punctuation', text: punct, index: currentIndex });
            }
            currentIndex++;
          }

          return (
            <p key={paraIndex} className="mb-4">
              {paraTokens.map((token, index) => {
                if (token.type === 'word') {
                  const lemma = token.text.toLowerCase();
                  const isKnown = knownLemmas.has(lemma);

                  return (
                    <span
                      key={`${paraIndex}-${index}`}
                      className={`
                        ${!isKnown ? 'bg-yellow-200 dark:bg-blue-500/40 px-1 rounded cursor-pointer hover:bg-yellow-300 dark:hover:bg-blue-500/60 transition-colors' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-0.5 rounded transition-colors'}
                        ${loadingTranslation ? 'opacity-50' : ''}
                      `}
                      onClick={(e) => handleWordClick(token.text, e)}
                      title={!isKnown ? 'New word - Click for translation' : 'Click for translation'}
                    >
                      {token.text}
                    </span>
                  );
                } else if (token.type === 'space') {
                  return <span key={`${paraIndex}-${index}`}>{token.text}</span>;
                } else {
                  // Punctuation
                  return (
                    <span key={`${paraIndex}-${index}`} className="text-gray-600 dark:text-gray-400">
                      {token.text}
                    </span>
                  );
                }
              })}
            </p>
          );
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
