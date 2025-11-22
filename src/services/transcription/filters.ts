/**
 * Hallucination filter service
 * Removes common Whisper AI hallucinations from transcripts
 */

export interface HallucinationPattern {
  pattern: RegExp;
  description: string;
  category: 'youtube' | 'markers' | 'credits' | 'repetition';
}

/**
 * Common Whisper hallucination patterns
 * Based on research from OpenAI community and academic studies
 */
export const HALLUCINATION_PATTERNS: HallucinationPattern[] = [
  // YouTube/Social Media CTAs (complete phrases only)
  // Note: We match surrounding punctuation to avoid leaving orphaned periods/exclamation marks
  {
    pattern: /[.,!?]?\s*thank you for watching(\s+(till the end|until the end))?[.,!?]?/gi,
    description: 'YouTube outro phrase',
    category: 'youtube',
  },
  {
    pattern: /[.,!?]?\s*thanks for watching(\s+(till the end|until the end))?[.,!?]?/gi,
    description: 'YouTube outro phrase',
    category: 'youtube',
  },
  {
    pattern: /[.,!?]?\s*please subscribe[.,!?]?/gi,
    description: 'YouTube CTA',
    category: 'youtube',
  },
  {
    pattern: /[.,!?]?\s*don't forget to like and subscribe[.,!?]?/gi,
    description: 'YouTube CTA',
    category: 'youtube',
  },
  {
    pattern: /[.,!?]?\s*subscribe to my channel[.,!?]?/gi,
    description: 'YouTube CTA',
    category: 'youtube',
  },
  {
    pattern: /[.,!?]?\s*like and subscribe[.,!?]?/gi,
    description: 'YouTube CTA',
    category: 'youtube',
  },

  // Music and sound markers
  {
    pattern: /\[music\]/gi,
    description: 'Music marker',
    category: 'markers',
  },
  {
    pattern: /\[applause\]/gi,
    description: 'Applause marker',
    category: 'markers',
  },
  {
    pattern: /\[blank[_\s]?audio\]/gi,
    description: 'Blank audio marker',
    category: 'markers',
  },
  {
    pattern: /♪+/g,
    description: 'Music note symbols',
    category: 'markers',
  },

  // Subtitle credits (multi-language)
  {
    pattern: /sottotitoli creati dalla comunità amara\.org/gi,
    description: 'Italian subtitle credit',
    category: 'credits',
  },
  {
    pattern: /legendas pela comunidade amara\.org/gi,
    description: 'Portuguese subtitle credit',
    category: 'credits',
  },
  {
    pattern: /subtitles by .{1,30}/gi,
    description: 'Subtitle attribution',
    category: 'credits',
  },
  {
    pattern: /transcribed by .{1,30}/gi,
    description: 'Transcription attribution',
    category: 'credits',
  },
];

/**
 * Filter settings interface
 */
export interface FilterSettings {
  enabled: boolean;
  filterYoutube: boolean;
  filterMarkers: boolean;
  filterCredits: boolean;
  filterRepetition: boolean;
  repetitionThreshold: number; // Number of consecutive repeats to trigger filter
}

/**
 * Default filter settings
 */
export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  enabled: true,
  filterYoutube: true,
  filterMarkers: true,
  filterCredits: true,
  filterRepetition: true,
  repetitionThreshold: 3,
};

/**
 * Remove hallucinated phrases from transcript
 */
export function removeHallucinations(
  text: string,
  settings: FilterSettings = DEFAULT_FILTER_SETTINGS
): string {
  if (!settings.enabled || !text) {
    return text;
  }

  let cleaned = text;

  // Apply pattern-based filters
  for (const { pattern, category } of HALLUCINATION_PATTERNS) {
    // Check if this category is enabled
    const shouldFilter =
      (category === 'youtube' && settings.filterYoutube) ||
      (category === 'markers' && settings.filterMarkers) ||
      (category === 'credits' && settings.filterCredits);

    if (shouldFilter) {
      cleaned = cleaned.replace(pattern, '');
    }
  }

  // Apply repetition filter
  if (settings.filterRepetition) {
    cleaned = removeRepetitiveLoops(cleaned, settings.repetitionThreshold);
  }

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Detect and remove repetitive loops
 * Identifies when the same sentence appears 3+ times consecutively
 */
export function removeRepetitiveLoops(text: string, threshold: number = 3): string {
  if (!text || threshold < 2) {
    return text;
  }

  // Split into sentences - keep delimiters with sentences
  const parts = text.split(/([.!?])\s*/);
  const sentences: string[] = [];

  // Reconstruct sentences with their punctuation
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i].trim()) {
      const sentence = parts[i].trim() + (parts[i + 1] || '');
      sentences.push(sentence);
    }
  }

  if (sentences.length < threshold) {
    return text; // Not enough sentences to have repetition
  }

  const result: string[] = [];
  let i = 0;

  while (i < sentences.length) {
    const currentSentence = sentences[i].trim();

    // Skip empty or very short fragments
    if (currentSentence.length < 2) {
      result.push(sentences[i]);
      i++;
      continue;
    }

    // Look ahead to count consecutive repetitions
    let repeatCount = 1;
    let j = i + 1;

    while (j < sentences.length && sentences[j].trim() === currentSentence) {
      repeatCount++;
      j++;
    }

    // If we found repetition above threshold, only keep one instance
    if (repeatCount >= threshold) {
      result.push(sentences[i]); // Keep only the first occurrence
      i = j; // Skip all the repeats
    } else {
      result.push(sentences[i]);
      i++;
    }
  }

  return result.join(' ');
}

/**
 * Get statistics about what was filtered
 */
export function getFilterStats(originalText: string, filteredText: string) {
  const removedChars = originalText.length - filteredText.length;
  const removalPercentage =
    originalText.length > 0 ? (removedChars / originalText.length) * 100 : 0;

  return {
    originalLength: originalText.length,
    filteredLength: filteredText.length,
    removedChars,
    removalPercentage: Math.round(removalPercentage * 10) / 10,
  };
}
