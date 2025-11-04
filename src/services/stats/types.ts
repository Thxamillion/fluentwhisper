/**
 * Stats and analytics types
 */

export interface OverallStats {
  totalSessions: number;
  totalSpeakingTimeSeconds: number;
  totalVocabularySize: number;
  averageWpm: number;
  currentStreakDays: number;
  longestStreakDays: number;
  avgUniqueWordsPerSession: number;
  avgNewWordsPerSession: number;
}

export interface TopWord {
  lemma: string;
  usageCount: number;
  formsSpoken: string[];
}

export interface DailySessionCount {
  date: string; // YYYY-MM-DD
  sessionCount: number;
  totalMinutes: number;
}

export interface WpmTrend {
  date: string; // YYYY-MM-DD
  avgWpm: number;
}

export interface VocabGrowth {
  date: string; // YYYY-MM-DD
  newWords: number;
  cumulativeTotal: number;
}
