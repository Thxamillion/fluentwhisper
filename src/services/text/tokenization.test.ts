/**
 * Tests for tokenization service
 */

import { describe, it, expect } from 'vitest';
import { tokenize, tokenizeWithStats } from './tokenization';

describe('tokenization', () => {
  describe('basic tokenization', () => {
    it('splits simple Spanish text into words', () => {
      const result = tokenize('estoy corriendo', 'es');
      expect(result).toEqual(['estoy', 'corriendo']);
    });

    it('splits English text into words', () => {
      const result = tokenize('I am running', 'en');
      expect(result).toEqual(['i', 'am', 'running']);
    });

    it('handles multiple spaces', () => {
      const result = tokenize('hello    world', 'en');
      expect(result).toEqual(['hello', 'world']);
    });

    it('handles leading and trailing whitespace', () => {
      const result = tokenize('  hello world  ', 'en');
      expect(result).toEqual(['hello', 'world']);
    });
  });

  describe('Spanish contractions', () => {
    it('expands "del" to "de el"', () => {
      const result = tokenize('la casa del niño', 'es');
      expect(result).toEqual(['la', 'casa', 'de', 'el', 'niño']);
    });

    it('expands "al" to "a el"', () => {
      const result = tokenize('voy al parque', 'es');
      expect(result).toEqual(['voy', 'a', 'el', 'parque']);
    });

    it('handles multiple contractions', () => {
      const result = tokenize('voy del parque al museo', 'es');
      expect(result).toEqual(['voy', 'de', 'el', 'parque', 'a', 'el', 'museo']);
    });
  });

  describe('punctuation handling', () => {
    it('removes basic punctuation by default', () => {
      const result = tokenize('Hello, world!', 'en');
      expect(result).toEqual(['hello', 'world']);
    });

    it('removes punctuation from Spanish text', () => {
      const result = tokenize('¡Hola! ¿Cómo estás?', 'es');
      expect(result).toEqual(['hola', 'cómo', 'estás']);
    });

    it('keeps hyphens in words by default', () => {
      const result = tokenize('well-being', 'en');
      expect(result).toEqual(['well-being']);
    });

    it('keeps apostrophes in contractions by default', () => {
      const result = tokenize("don't worry", 'en');
      expect(result).toEqual(["don't", 'worry']);
    });

    it('removes hyphens when keepHyphens is false', () => {
      const result = tokenize('well-being', 'en', { keepHyphens: false });
      expect(result).toEqual(['wellbeing']);
    });

    it('removes apostrophes when keepApostrophes is false', () => {
      const result = tokenize("don't", 'en', { keepApostrophes: false });
      expect(result).toEqual(['dont']);
    });
  });

  describe('lowercase option', () => {
    it('converts to lowercase by default', () => {
      const result = tokenize('Hello World', 'en');
      expect(result).toEqual(['hello', 'world']);
    });

    it('preserves case when lowercase is false', () => {
      const result = tokenize('Hello World', 'en', { lowercase: false });
      expect(result).toEqual(['Hello', 'World']);
    });
  });

  describe('tokenizeWithStats', () => {
    it('returns tokens and statistics', () => {
      const result = tokenizeWithStats('hello world hello', 'en');
      expect(result.tokens).toEqual(['hello', 'world', 'hello']);
      expect(result.uniqueTokens).toEqual(['hello', 'world']);
      expect(result.totalCount).toBe(3);
      expect(result.uniqueCount).toBe(2);
    });

    it('handles Spanish text with stats', () => {
      const result = tokenizeWithStats('estoy corriendo del parque', 'es');
      expect(result.tokens).toEqual(['estoy', 'corriendo', 'de', 'el', 'parque']);
      expect(result.uniqueTokens).toEqual(['estoy', 'corriendo', 'de', 'el', 'parque']);
      expect(result.totalCount).toBe(5);
      expect(result.uniqueCount).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = tokenize('', 'en');
      expect(result).toEqual([]);
    });

    it('handles string with only whitespace', () => {
      const result = tokenize('   ', 'en');
      expect(result).toEqual([]);
    });

    it('handles string with only punctuation', () => {
      const result = tokenize('!!!', 'en');
      expect(result).toEqual([]);
    });

    it('handles mixed Spanish and numbers', () => {
      const result = tokenize('tengo 25 años', 'es');
      expect(result).toEqual(['tengo', '25', 'años']);
    });

    it('handles text with periods and commas', () => {
      const result = tokenize('Hello, my name is John.', 'en');
      expect(result).toEqual(['hello', 'my', 'name', 'is', 'john']);
    });
  });
});
