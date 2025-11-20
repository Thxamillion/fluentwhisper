/**
 * Recording service - wraps Tauri commands for audio recording
 */

import { invoke } from '@tauri-apps/api/core';
import type { DeviceInfo, RecordingResult, TranscriptionResult, TranscriptSegment } from './types';
import { useSettingsStore } from '@/stores/settingsStore';
import { logger } from '@/services/logger'
import { removeHallucinations } from '@/services/transcription/filters';

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
  primaryLanguage: string,
  sessionType?: 'free_speak' | 'read_aloud' | 'tutor' | 'conversation',
  textLibraryId?: string,
  sourceText?: string
): Promise<ServiceResult<string>> {
  try {
    logger.debug('Calling create_recording_session', 'createSession', {
      language,
      primaryLanguage,
      sessionType: sessionType || null,
      textLibraryId: textLibraryId || null,
      sourceText: sourceText || null,
    });

    const sessionId = await invoke<string>('create_recording_session', {
      language,
      primaryLanguage,
      sessionType: sessionType || null,
      textLibraryId: textLibraryId || null,
      sourceText: sourceText || null,
    });

    logger.debug('[createSession] Success, session ID:', sessionId);
    return { success: true, data: sessionId };
  } catch (error) {
    logger.error('Failed:', 'createSession', error);
    logger.error('Error type:', 'createSession', typeof error);
    logger.error('Error keys:', 'createSession', error ? Object.keys(error) : 'null');
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
 * Transcribe a recorded audio file using local Whisper model
 */
export async function transcribeAudio(
  audioPath: string,
  language?: string,
  modelPath?: string,
  sessionType?: 'free_speak' | 'read_aloud' | 'tutor' | 'conversation'
): Promise<ServiceResult<{ text: string; segments: TranscriptSegment[] }>> {
  try {
    // Get selected model from settings
    const selectedModel = useSettingsStore.getState().settings.selectedModel;

    if (!selectedModel) {
      return {
        success: false,
        error: 'No transcription model selected. Please select a model in Settings.',
      };
    }

    // OSS version: always use local transcription
    logger.debug('Using local transcription with model:', selectedModel);

    const response = await invoke<{ text: string; segments: TranscriptSegment[] }>('transcribe', {
      audioPath,
      language: language || '',
      modelPath: modelPath || null,
      sessionType: sessionType || null,
    });

    // Apply hallucination filters if enabled
    const settings = useSettingsStore.getState().settings;
    const filteredText = removeHallucinations(response.text, {
      enabled: settings.hallucinationFilterEnabled,
      filterYoutube: settings.filterYoutubeHallucinations,
      filterMarkers: settings.filterMarkerHallucinations,
      filterCredits: settings.filterCreditHallucinations,
      filterRepetition: settings.filterRepetitionHallucinations,
      repetitionThreshold: settings.repetitionThreshold,
    });

    logger.debug('Hallucination filter applied', 'transcribeAudio', {
      original: response.text.length,
      filtered: filteredText.length,
      removed: response.text.length - filteredText.length,
    });

    return { success: true, data: { ...response, text: filteredText } };
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
  segments: TranscriptSegment[],
  durationSeconds: number,
  language: string,
  sessionType?: 'free_speak' | 'read_aloud' | 'tutor' | 'conversation',
  textLibraryId?: string,
  sourceText?: string
): Promise<ServiceResult<TranscriptionResult>> {
  try {
    const stats = await invoke('complete_recording_session', {
      request: {
        sessionId,
        audioPath,
        transcript,
        segments,
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
        segments,
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

/**
 * Delete an audio file (used when discarding recordings)
 */
export async function deleteAudioFile(audioPath: string): Promise<ServiceResult<void>> {
  try {
    await invoke('delete_audio_file', { path: audioPath });
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Failed to delete audio file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
