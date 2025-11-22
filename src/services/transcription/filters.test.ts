/**
 * Tests for hallucination filters
 */

import { removeHallucinations, removeRepetitiveLoops, DEFAULT_FILTER_SETTINGS } from './filters';

describe('Hallucination Filters', () => {
  describe('YouTube/Social Media Filters', () => {
    it('should remove "thank you for watching"', () => {
      const input = 'This is my speech. Thank you for watching.';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('This is my speech'); // Trailing period removed with phrase
    });

    it('should remove "thanks for watching till the end"', () => {
      const input = 'Great talk. Thanks for watching till the end!';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('Great talk'); // Trailing punctuation removed with phrase
    });

    it('should remove "please subscribe"', () => {
      const input = 'Please subscribe to my channel.';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('to my channel.'); // "Please subscribe" removed, keeps rest
    });

    it('should remove "don\'t forget to like and subscribe"', () => {
      const input = 'Don\'t forget to like and subscribe!';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe(''); // Entire phrase is hallucination
    });

    it('should keep legitimate use of word "subscribe"', () => {
      const input = 'I want to subscribe to Spanish lessons.';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('I want to subscribe to Spanish lessons.'); // Not a CTA phrase
    });
  });

  describe('Music/Sound Marker Filters', () => {
    it('should remove [MUSIC] markers', () => {
      const input = 'Hello [MUSIC] world [music] test';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('Hello world test');
    });

    it('should remove music note symbols', () => {
      const input = 'Test ♪♪ more text ♪';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('Test more text');
    });

    it('should remove [APPLAUSE] markers', () => {
      const input = 'Great speech [APPLAUSE] thank you';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('Great speech thank you');
    });

    it('should remove [BLANK_AUDIO] markers', () => {
      const input = 'Start [BLANK_AUDIO] end [blank_audio] done';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('Start end done');
    });
  });

  describe('Subtitle Credit Filters', () => {
    it('should remove Italian Amara credits', () => {
      const input = 'Sottotitoli creati dalla comunità Amara.org some text';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('some text');
    });

    it('should remove Portuguese Amara credits', () => {
      const input = 'Legendas pela comunidade Amara.org more text';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('more text');
    });

    it('should remove "Subtitles by" credits', () => {
      const input = 'Real content here. Subtitles by John Doe.';
      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);
      expect(output).toBe('Real content here.'); // "Subtitles by..." removed
    });
  });

  describe('Repetition Filter', () => {
    it('should remove sentences repeated 3 times', () => {
      const input = 'Hello world. Hello world. Hello world. Different sentence.';
      const output = removeRepetitiveLoops(input, 3);
      expect(output).toBe('Hello world. Different sentence.');
    });

    it('should remove sentences repeated 4 times', () => {
      const input = 'Test. Test. Test. Test. New text.';
      const output = removeRepetitiveLoops(input, 3);
      expect(output).toBe('Test. New text.');
    });

    it('should NOT remove sentences repeated only 2 times', () => {
      const input = 'Hello. Hello. World.';
      const output = removeRepetitiveLoops(input, 3);
      expect(output).toBe('Hello. Hello. World.');
    });

    it('should handle mixed repeated and unique sentences', () => {
      const input = 'Start. Repeat. Repeat. Repeat. Middle. End. End. End. Final.';
      const output = removeRepetitiveLoops(input, 3);
      expect(output).toBe('Start. Repeat. Middle. End. Final.');
    });
  });

  describe('Filter Settings', () => {
    it('should respect disabled filter setting', () => {
      const input = 'Thank you for watching. [MUSIC] test';
      const output = removeHallucinations(input, {
        ...DEFAULT_FILTER_SETTINGS,
        enabled: false,
      });
      expect(output).toBe('Thank you for watching. [MUSIC] test');
    });

    it('should respect individual category toggles', () => {
      const input = 'Thank you for watching. [MUSIC] test';
      const output = removeHallucinations(input, {
        ...DEFAULT_FILTER_SETTINGS,
        filterYoutube: false, // Keep YouTube phrases
        filterMarkers: true,  // Remove markers
      });
      expect(output).toBe('Thank you for watching. test');
    });
  });

  describe('Real-world Examples', () => {
    it('should handle complex mixed hallucinations', () => {
      const input = `
        I was practicing my Spanish today.
        Thank you for watching.
        [MUSIC]
        Please subscribe to my channel.
        I learned about verb conjugations.
        ♪♪
      `.trim();

      const output = removeHallucinations(input, DEFAULT_FILTER_SETTINGS);

      // Should keep real content, remove hallucinations
      expect(output).toContain('I was practicing my Spanish today');
      expect(output).toContain('I learned about verb conjugations');
      expect(output).not.toContain('Thank you for watching');
      expect(output).not.toContain('[MUSIC]');
      expect(output).not.toContain('Please subscribe');
      expect(output).not.toContain('♪');
    });
  });
});
