/**
 * DictionaryButton - Opens dictionary in external browser
 * Shows next to empty translations in vocabulary table
 */

import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildLookupUrl } from '@/services/dictionaries';
import { open } from '@tauri-apps/plugin-shell';

interface DictionaryButtonProps {
  word: string;
  language: string;
}

// Default dictionary URLs by language
const DEFAULT_DICTIONARIES: Record<string, string> = {
  en: 'https://www.merriam-webster.com/dictionary/[WORD]',
  es: 'https://www.wordreference.com/es/en/translation.asp?spen=[WORD]',
  fr: 'https://www.wordreference.com/fren/[WORD]',
  de: 'https://www.wordreference.com/deen/[WORD]',
  it: 'https://www.wordreference.com/iten/[WORD]',
  pt: 'https://www.wordreference.com/pten/[WORD]',
  nl: 'https://www.wordreference.com/nlen/[WORD]',
  ru: 'https://www.wordreference.com/ruen/[WORD]',
};

export function DictionaryButton({ word, language }: DictionaryButtonProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('[DictionaryButton] Clicked!', { word, language });

    const urlTemplate = DEFAULT_DICTIONARIES[language];
    if (!urlTemplate) {
      console.warn(`No default dictionary for language: ${language}`);
      return;
    }

    const url = buildLookupUrl(urlTemplate, word);
    console.log('[DictionaryButton] Opening URL:', url);

    try {
      await open(url);
      console.log('[DictionaryButton] URL opened successfully');
    } catch (error) {
      console.error('[DictionaryButton] Failed to open URL:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="h-6 px-2 text-xs"
      title={`Look up "${word}" in WordReference`}
    >
      <BookOpen className="w-3 h-3 mr-1" />
      Dictionary
    </Button>
  );
}
