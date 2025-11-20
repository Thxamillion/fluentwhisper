/**
 * Type definitions for vocabulary services
 */

export type LangCode = 'es' | 'en' | 'fr' | 'de';

export interface VocabWord {
  id: number;
  language: string;
  lemma: string;
  forms_spoken: string[];
  first_seen_at: number;
  last_seen_at: number;
  usage_count: number;
  mastered: boolean;
  tags: string[];
}

export interface VocabWordWithTranslation extends VocabWord {
  translation: string | null;
}

export interface VocabStats {
  total_words: number;
  mastered_words: number;
  words_this_week: number;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Tag constants
export const VOCAB_TAGS = {
  NEEDS_PRACTICE: 'needs-practice',
  MASTERED: 'mastered',
} as const;

export type VocabTag = typeof VOCAB_TAGS[keyof typeof VOCAB_TAGS];
