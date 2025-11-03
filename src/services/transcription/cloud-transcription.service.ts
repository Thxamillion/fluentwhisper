import { supabase } from '@/lib/supabase'

export interface CloudTranscriptionOptions {
  provider?: 'openai' | 'assemblyai' | 'google'
  language?: string
}

export interface CloudTranscriptionResult {
  text: string
  durationSeconds: number
  provider: string
  model: string
  costUsd: number
}

export class CloudTranscriptionService {
  private static readonly EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`

  /**
   * Transcribe audio using cloud-based Whisper API
   */
  static async transcribe(
    audioBlob: Blob,
    options: CloudTranscriptionOptions = {}
  ): Promise<CloudTranscriptionResult> {
    // Get current user session for auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      throw new Error('Authentication required for cloud transcription')
    }

    // Prepare form data
    const formData = new FormData()
    formData.append('audio', audioBlob)
    formData.append('provider', options.provider || 'openai')

    if (options.language) {
      formData.append('language', options.language)
    }

    // Call Edge Function
    const response = await fetch(this.EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))

      if (response.status === 403) {
        throw new Error('Premium subscription required for cloud transcription')
      }

      throw new Error(error.error || `Transcription failed: ${response.status}`)
    }

    const result = await response.json()

    return {
      text: result.text,
      durationSeconds: result.duration_seconds,
      provider: result.provider,
      model: result.model,
      costUsd: result.cost_usd
    }
  }

  /**
   * Check if cloud transcription is available for current user
   */
  static async isAvailable(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    // Check if user has premium subscription
    const { data: subscription } = await supabase
      .from('user_subscription_status')
      .select('is_premium')
      .eq('user_id', session.user.id)
      .single()

    return subscription?.is_premium === true
  }
}
