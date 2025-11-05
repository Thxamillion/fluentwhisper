/**
 * Unit tests for recording service - Primary Language tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSession } from './recording';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('Recording Service - Primary Language', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should pass primaryLanguage to Tauri command', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockResolvedValue('session-123');

      const result = await createSession('es', 'en', 'free_speak');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('session-123');
      }
      expect(mockInvoke).toHaveBeenCalledWith('create_recording_session', {
        language: 'es',
        primaryLanguage: 'en',
        sessionType: 'free_speak',
        textLibraryId: null,
        sourceText: null,
      });
    });

    it('should handle different language pairs', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockResolvedValue('session-456');

      // Test en-es pair (English learner with Spanish native)
      const result = await createSession('en', 'es', 'free_speak');

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('create_recording_session', {
        language: 'en',
        primaryLanguage: 'es',
        sessionType: 'free_speak',
        textLibraryId: null,
        sourceText: null,
      });
    });

    it('should include primaryLanguage with read_aloud session type', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockResolvedValue('session-789');

      const result = await createSession(
        'fr',
        'en',
        'read_aloud',
        'text-123',
        'Bonjour le monde'
      );

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('create_recording_session', {
        language: 'fr',
        primaryLanguage: 'en',
        sessionType: 'read_aloud',
        textLibraryId: 'text-123',
        sourceText: 'Bonjour le monde',
      });
    });

    it('should handle multiple language pairs correctly', async () => {
      const mockInvoke = vi.mocked(invoke);

      const testCases = [
        { target: 'es', primary: 'en', sessionId: 'session-1' },
        { target: 'en', primary: 'es', sessionId: 'session-2' },
        { target: 'fr', primary: 'de', sessionId: 'session-3' },
        { target: 'de', primary: 'fr', sessionId: 'session-4' },
        { target: 'it', primary: 'en', sessionId: 'session-5' },
      ];

      for (const testCase of testCases) {
        mockInvoke.mockResolvedValueOnce(testCase.sessionId);

        const result = await createSession(testCase.target, testCase.primary);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(testCase.sessionId);
        }
        expect(mockInvoke).toHaveBeenCalledWith('create_recording_session', {
          language: testCase.target,
          primaryLanguage: testCase.primary,
          sessionType: null,
          textLibraryId: null,
          sourceText: null,
        });
      }
    });

    it('should handle same language for both fields', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockResolvedValue('session-same-lang');

      // Test case: User practicing pronunciation in their native language
      const result = await createSession('en', 'en');

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('create_recording_session', {
        language: 'en',
        primaryLanguage: 'en',
        sessionType: null,
        textLibraryId: null,
        sourceText: null,
      });
    });

    it('should return error when Tauri command fails', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockRejectedValue(new Error('Database connection failed'));

      const result = await createSession('es', 'en');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Database connection failed');
      }
    });

    it('should handle null/undefined optional parameters', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockResolvedValue('session-minimal');

      const result = await createSession('es', 'en');

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('create_recording_session', {
        language: 'es',
        primaryLanguage: 'en',
        sessionType: null,
        textLibraryId: null,
        sourceText: null,
      });
    });

    it('should pass all parameters for read_aloud session', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockResolvedValue('session-complete');

      const result = await createSession(
        'de',
        'fr',
        'read_aloud',
        'text-abc-123',
        'Guten Tag, wie geht es dir?'
      );

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('create_recording_session', {
        language: 'de',
        primaryLanguage: 'fr',
        sessionType: 'read_aloud',
        textLibraryId: 'text-abc-123',
        sourceText: 'Guten Tag, wie geht es dir?',
      });
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockRejectedValue(new Error('Network timeout'));

      const result = await createSession('es', 'en');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Network timeout');
      }
    });

    it('should handle unknown errors', async () => {
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockRejectedValue('Unknown error string');

      const result = await createSession('es', 'en');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });

  describe('Parameter validation', () => {
    it('should accept all supported language codes', async () => {
      const mockInvoke = vi.mocked(invoke);
      const supportedLanguages = ['es', 'en', 'fr', 'de', 'it'];

      for (const lang of supportedLanguages) {
        mockInvoke.mockResolvedValueOnce(`session-${lang}`);

        const result = await createSession(lang, 'en');

        expect(result.success).toBe(true);
      }
    });

    it('should accept both session types', async () => {
      const mockInvoke = vi.mocked(invoke);

      // Free speak
      mockInvoke.mockResolvedValueOnce('session-free');
      let result = await createSession('es', 'en', 'free_speak');
      expect(result.success).toBe(true);

      // Read aloud
      mockInvoke.mockResolvedValueOnce('session-read');
      result = await createSession('es', 'en', 'read_aloud');
      expect(result.success).toBe(true);
    });
  });
});
