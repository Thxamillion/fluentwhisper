/**
 * React Query hooks for recording management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import { recordingService } from '../../services/recording';
import type { DeviceInfo, RecordingResult } from '../../services/recording/types';

/**
 * Hook to get available recording devices
 */
export function useRecordingDevices() {
  return useQuery({
    queryKey: ['recording', 'devices'],
    queryFn: async () => {
      const result = await recordingService.getRecordingDevices();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds - devices don't change often
  });
}

/**
 * Hook to manage recording state and operations
 */
export function useRecording() {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionType, setSessionType] = useState<'free_speak' | 'read_aloud'>('free_speak');
  const [textLibraryId, setTextLibraryId] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('en');
  const [primaryLanguage, setPrimaryLanguage] = useState<string>('en');
  const startTimeRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tempSessionIdRef = useRef<string | null>(null); // Temporary ID for audio file naming

  // Start recording mutation
  const startMutation = useMutation({
    mutationFn: async ({
      deviceName,
    }: {
      deviceName?: string;
    }) => {
      // Generate a temporary ID for the audio file (will be used for naming)
      const tempId = crypto.randomUUID();

      // Start recording with temp ID (no DB session created yet)
      const result = await recordingService.startRecording(tempId, deviceName);
      if (!result.success) {
        throw new Error(result.error);
      }
      return tempId;
    },
    onMutate: async () => {
      // Optimistically set isRecording immediately for instant UI feedback
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setElapsedTime(0);

      // Start timer immediately
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    },
    onSuccess: async (tempId) => {
      tempSessionIdRef.current = tempId;
      // isRecording already set in onMutate
    },
    onError: (error) => {
      console.error('Failed to start recording:', error);

      // Clean up optimistic state
      setIsRecording(false);
      tempSessionIdRef.current = null;

      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      startTimeRef.current = null;
      setElapsedTime(0);
    },
  });

  // Stop recording mutation
  const stopMutation = useMutation({
    mutationFn: async () => {
      const result = await recordingService.stopRecording();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setIsRecording(false);
      startTimeRef.current = null;
    },
    onError: (error) => {
      console.error('Failed to stop recording:', error);
    },
  });

  // Create session mutation (called when user decides to save)
  const createSessionMutation = useMutation({
    mutationFn: async ({
      language,
      primaryLanguage,
      sessionType,
      textLibraryId,
      sourceText,
    }: {
      language: string;
      primaryLanguage: string;
      sessionType?: 'free_speak' | 'read_aloud';
      textLibraryId?: string;
      sourceText?: string;
    }) => {
      const sessionResult = await recordingService.createSession(
        language,
        primaryLanguage,
        sessionType,
        textLibraryId,
        sourceText
      );
      if (!sessionResult.success) {
        throw new Error(sessionResult.error);
      }
      return sessionResult.data;
    },
    onSuccess: (newSessionId) => {
      setSessionId(newSessionId);
    },
  });

  // Transcribe audio mutation
  const transcribeMutation = useMutation({
    mutationFn: async ({
      audioPath,
      language,
    }: {
      audioPath: string;
      language?: string;
    }) => {
      const result = await recordingService.transcribeAudio(audioPath, language);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async ({
      sessionId,
      audioPath,
      transcript,
      segments,
      durationSeconds,
      language,
      sessionType,
      textLibraryId,
      sourceText,
    }: {
      sessionId: string;
      audioPath: string;
      transcript: string;
      segments: import('../../services/recording/types').TranscriptSegment[];
      durationSeconds: number;
      language: string;
      sessionType?: 'free_speak' | 'read_aloud';
      textLibraryId?: string;
      sourceText?: string;
    }) => {
      const result = await recordingService.completeSession(
        sessionId,
        audioPath,
        transcript,
        segments,
        durationSeconds,
        language,
        sessionType,
        textLibraryId,
        sourceText
      );
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['userVocab'] }); // Fixed: was 'vocabulary', should be 'userVocab'
      queryClient.invalidateQueries({ queryKey: ['vocabStats'] }); // Also invalidate vocab stats
      queryClient.invalidateQueries({ queryKey: ['recentVocab'] }); // And recent vocab for dashboard
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      // Reset state
      setSessionId(null);
      setSessionType('free_speak');
      setTextLibraryId(null);
      setSourceText(null);
      setElapsedTime(0);
    },
  });

  // Start recording function - stores metadata for later session creation
  const startRecording = useCallback(
    (
      lang: string,
      deviceName?: string,
      primaryLang?: string,
      type: 'free_speak' | 'read_aloud' = 'free_speak',
      libraryId?: string,
      text?: string
    ) => {
      // Store metadata for session creation when user saves
      setLanguage(lang);
      setPrimaryLanguage(primaryLang || 'en');
      setSessionType(type);
      setTextLibraryId(libraryId || null);
      setSourceText(text || null);

      // Start recording without creating DB session
      startMutation.mutate({ deviceName });
    },
    [startMutation]
  );

  // Stop recording function
  const stopRecording = useCallback(() => {
    return stopMutation.mutateAsync();
  }, [stopMutation]);

  // Create session function (called when user clicks "Transcribe & Save")
  const createSession = useCallback(() => {
    return createSessionMutation.mutateAsync({
      language,
      primaryLanguage,
      sessionType,
      textLibraryId: textLibraryId || undefined,
      sourceText: sourceText || undefined,
    });
  }, [createSessionMutation, language, primaryLanguage, sessionType, textLibraryId, sourceText]);

  // Transcribe function
  const transcribe = useCallback(
    (audioPath: string, lang?: string) => {
      return transcribeMutation.mutateAsync({ audioPath, language: lang });
    },
    [transcribeMutation]
  );

  // Complete session function
  const completeSession = useCallback(
    (
      sessionId: string,
      audioPath: string,
      transcript: string,
      segments: import('../../services/recording/types').TranscriptSegment[],
      durationSeconds: number,
      language: string
    ) => {
      return completeSessionMutation.mutateAsync({
        sessionId,
        audioPath,
        transcript,
        segments,
        durationSeconds,
        language,
        sessionType,
        textLibraryId: textLibraryId || undefined,
        sourceText: sourceText || undefined,
      });
    },
    [completeSessionMutation, sessionType, textLibraryId, sourceText]
  );

  // Reset function for discarding recordings
  const reset = useCallback(() => {
    setSessionId(null);
    setSessionType('free_speak');
    setTextLibraryId(null);
    setSourceText(null);
    setLanguage('en');
    setPrimaryLanguage('en');
    setElapsedTime(0);
    startTimeRef.current = null;
    tempSessionIdRef.current = null;

    // Stop timer if running
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return {
    isRecording,
    sessionId,
    tempSessionId: tempSessionIdRef.current,
    sessionType,
    textLibraryId,
    sourceText,
    language,
    primaryLanguage,
    elapsedTime,
    startRecording,
    stopRecording,
    createSession,
    transcribe,
    completeSession,
    reset,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isCreatingSession: createSessionMutation.isPending,
    isTranscribing: transcribeMutation.isPending,
    isCompleting: completeSessionMutation.isPending,
    error:
      startMutation.error ||
      stopMutation.error ||
      createSessionMutation.error ||
      transcribeMutation.error ||
      completeSessionMutation.error,
  };
}
