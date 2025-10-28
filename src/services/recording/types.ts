/**
 * Recording service types
 */

export interface DeviceInfo {
  name: string;
  isDefault: boolean;
}

export interface RecordingResult {
  filePath: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  sampleCount: number;
}

export interface RecordingState {
  isRecording: boolean;
  sessionId: string | null;
  startTime: number | null;
}

export interface TranscriptionResult {
  text: string;
  sessionId: string;
  audioPath: string;
  durationSeconds: number;
}
