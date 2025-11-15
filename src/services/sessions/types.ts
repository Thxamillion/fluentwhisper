/**
 * TypeScript types for sessions
 * Matches Rust SessionData struct
 */

export type SessionType = 'free_speak' | 'read_aloud' | 'tutor' | 'conversation';

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
  sessionType: SessionType | null;
  textLibraryId: string | null;
  sourceText: string | null;
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
