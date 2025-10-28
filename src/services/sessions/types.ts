/**
 * TypeScript types for sessions
 * Matches Rust SessionData struct
 */

export interface SessionData {
  id: string;
  language: string;
  startedAt: number;
  endedAt: number | null;
  duration: number | null;
  audioPath: string | null;
  transcript: string | null;
  wordCount: number | null;
  uniqueWordCount: number | null;
  wpm: number | null;
  newWordCount: number | null;
}

export interface SessionStats {
  wordCount: number;
  uniqueWordCount: number;
  wpm: number;
  newWordCount: number;
}

export interface SessionWord {
  lemma: string;
  count: number;
  isNew: boolean;
}
