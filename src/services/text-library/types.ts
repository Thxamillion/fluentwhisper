/**
 * TypeScript types for text library
 * Matches Rust TextLibraryItem struct
 */

export type SourceType = 'manual' | 'text_file';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface TextLibraryItem {
  id: string;
  title: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  content: string;
  language: string;
  wordCount: number | null;
  estimatedDuration: number | null;
  difficultyLevel: DifficultyLevel | null;
  createdAt: number;
  updatedAt: number;
  tags: string | null;
}

export interface CreateTextLibraryItemInput {
  title: string;
  sourceType: SourceType;
  sourceUrl?: string;
  content: string;
  language: string;
  difficultyLevel?: DifficultyLevel;
  tags?: string[];
}

export interface UpdateTextLibraryItemInput {
  title?: string;
  sourceType?: SourceType;
  sourceUrl?: string;
  content?: string;
  difficultyLevel?: DifficultyLevel;
  tags?: string[];
}
