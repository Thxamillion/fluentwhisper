export interface TranscriptionRequest {
  audio: Blob
  provider: 'openai' | 'assemblyai' | 'google'
  language?: string
}

export interface TranscriptionResponse {
  text: string
  duration_seconds: number
  provider: string
  model: string
  cost_usd: number
}

export interface UsageRecord {
  userId: string
  provider: string
  model: string
  durationSeconds: number
  costUsd: number
  language: string | null
  audioSizeBytes: number
  success: boolean
  errorMessage?: string
}
