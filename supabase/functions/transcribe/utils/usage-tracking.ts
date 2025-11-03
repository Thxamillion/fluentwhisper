import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { UsageRecord } from '../types.ts'

export async function trackUsage(
  supabase: SupabaseClient,
  usage: UsageRecord
): Promise<void> {
  const { error } = await supabase
    .from('transcription_usage')
    .insert({
      user_id: usage.userId,
      provider: usage.provider,
      model: usage.model,
      duration_seconds: usage.durationSeconds,
      cost_usd: usage.costUsd,
      language: usage.language,
      audio_size_bytes: usage.audioSizeBytes,
      success: usage.success,
      error_message: usage.errorMessage
    })

  if (error) {
    console.error('Failed to track usage:', error)
    // Don't throw - usage tracking failure shouldn't break transcription
  }
}
