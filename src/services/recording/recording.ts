/**
 * Recording service - wraps Tauri commands for audio recording
 */

import { invoke } from '@tauri-apps/api/core';
import type { DeviceInfo, RecordingResult, TranscriptionResult } from './types';

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get list of available recording devices
 */
export async function getRecordingDevices(): Promise<ServiceResult<DeviceInfo[]>> {
  try {
    const devices = await invoke<DeviceInfo[]>('get_recording_devices');
    return { success: true, data: devices };
  } catch (error) {
    console.error('Failed to get recording devices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new recording session in the database
 */
export async function createSession(
  language: string,
  sessionType?: 'free_speak' | 'read_aloud',
  textLibraryId?: string,
  sourceText?: string
): Promise<ServiceResult<string>> {
  try {
    const sessionId = await invoke<string>('create_recording_session', {
      language,
      sessionType: sessionType || null,
      textLibraryId: textLibraryId || null,
      sourceText: sourceText || null,
    });
    return { success: true, data: sessionId };
  } catch (error) {
    console.error('Failed to create session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Start recording audio
 */
export async function startRecording(
  sessionId: string,
  deviceName?: string
): Promise<ServiceResult<void>> {
  try {
    await invoke('start_recording', {
      sessionId,
      deviceName: deviceName || null,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to start recording:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Stop recording and get the recording result
 */
export async function stopRecording(): Promise<ServiceResult<RecordingResult>> {
  try {
    const result = await invoke<RecordingResult>('stop_recording');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to stop recording:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Transcribe a recorded audio file
 */
export async function transcribeAudio(
  audioPath: string,
  language?: string,
  modelPath?: string
): Promise<ServiceResult<string>> {
  try {
    const text = await invoke<string>('transcribe', {
      audioPath,
      language: language || '',
      modelPath: modelPath || null,
    });
    return { success: true, data: text };
  } catch (error) {
    console.error('Failed to transcribe audio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Complete a recording session with transcription and processing
 */
export async function completeSession(
  sessionId: string,
  audioPath: string,
  transcript: string,
  durationSeconds: number,
  language: string,
  sessionType?: 'free_speak' | 'read_aloud',
  textLibraryId?: string,
  sourceText?: string
): Promise<ServiceResult<TranscriptionResult>> {
  try {
    const stats = await invoke('complete_recording_session', {
      request: {
        sessionId,
        audioPath,
        transcript,
        durationSeconds,
        language,
        sessionType: sessionType || null,
        textLibraryId: textLibraryId || null,
        sourceText: sourceText || null,
      },
    });

    return {
      success: true,
      data: {
        text: transcript,
        sessionId,
        audioPath,
        durationSeconds,
      },
    };
  } catch (error) {
    console.error('Failed to complete session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
