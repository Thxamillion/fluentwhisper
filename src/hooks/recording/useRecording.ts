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
  const startTimeRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording mutation
  const startMutation = useMutation({
    mutationFn: async (deviceName?: string) => {
      const newSessionId = crypto.randomUUID();
      const result = await recordingService.startRecording(newSessionId, deviceName);
      if (!result.success) {
        throw new Error(result.error);
      }
      return newSessionId;
    },
    onSuccess: (newSessionId) => {
      setSessionId(newSessionId);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setElapsedTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    },
    onError: (error) => {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      setSessionId(null);
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
      durationSeconds,
      language,
    }: {
      sessionId: string;
      audioPath: string;
      transcript: string;
      durationSeconds: number;
      language: string;
    }) => {
      const result = await recordingService.completeSession(
        sessionId,
        audioPath,
        transcript,
        durationSeconds,
        language
      );
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      // Reset state
      setSessionId(null);
      setElapsedTime(0);
    },
  });

  // Start recording function
  const startRecording = useCallback(
    (deviceName?: string) => {
      startMutation.mutate(deviceName);
    },
    [startMutation]
  );

  // Stop recording function
  const stopRecording = useCallback(() => {
    return stopMutation.mutateAsync();
  }, [stopMutation]);

  // Transcribe function
  const transcribe = useCallback(
    (audioPath: string, language?: string) => {
      return transcribeMutation.mutateAsync({ audioPath, language });
    },
    [transcribeMutation]
  );

  // Complete session function
  const completeSession = useCallback(
    (
      sessionId: string,
      audioPath: string,
      transcript: string,
      durationSeconds: number,
      language: string
    ) => {
      return completeSessionMutation.mutateAsync({
        sessionId,
        audioPath,
        transcript,
        durationSeconds,
        language,
      });
    },
    [completeSessionMutation]
  );

  return {
    isRecording,
    sessionId,
    elapsedTime,
    startRecording,
    stopRecording,
    transcribe,
    completeSession,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isTranscribing: transcribeMutation.isPending,
    isCompleting: completeSessionMutation.isPending,
    error:
      startMutation.error ||
      stopMutation.error ||
      transcribeMutation.error ||
      completeSessionMutation.error,
  };
}
