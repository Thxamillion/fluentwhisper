/**
 * Recording service - wraps Tauri commands for audio recording
 */

import { invoke } from '@tauri-apps/api/core';
import type { DeviceInfo, RecordingResult, TranscriptionResult, TranscriptSegment } from './types';
import { CloudTranscriptionService } from '../transcription/cloud-transcription.service';
import { isCloudModel } from '@/stores/settingsStore';
import { useSettingsStore } from '@/stores/settingsStore';

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
  sessionType?: 'free_speak' | 'read_aloud',
  textLibraryId?: string,
  sourceText?: string
): Promise<ServiceResult<string>> {
  try {
    const sessionId = await invoke<string>('create_recording_session', {
      language,
      primaryLanguage,
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
 * Transcribe a recorded audio file using either local or cloud model
 */
export async function transcribeAudio(
  audioPath: string,
  language?: string,
  modelPath?: string
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

    // Route to cloud or local transcription based on model
    if (isCloudModel(selectedModel)) {
      // Cloud transcription
      console.log('Using cloud transcription with model:', selectedModel);

      // Read audio file as blob (using Rust command)
      const audioData = await invoke<number[]>('read_audio_file', { path: audioPath });
      const audioBlob = new Blob([new Uint8Array(audioData)], { type: 'audio/webm' });

      // Call cloud service
      const result = await CloudTranscriptionService.transcribe(audioBlob, {
        provider: 'openai', // Extract from selectedModel if needed
        language: language || undefined,
      });

      console.log(`Cloud transcription completed: ${result.durationSeconds}s, cost: $${result.costUsd.toFixed(4)}`);

      // Cloud transcription doesn't provide segments yet, return empty array
      return { success: true, data: { text: result.text, segments: [] } };
    } else {
      // Local transcription (existing code)
      console.log('Using local transcription with model:', selectedModel);

      const response = await invoke<{ text: string; segments: TranscriptSegment[] }>('transcribe', {
        audioPath,
        language: language || '',
        modelPath: modelPath || null,
      });

      return { success: true, data: response };
    }
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
