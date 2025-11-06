import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { transcribeWithOpenAI } from './providers/openai.ts'
import { validateAuth } from './utils/auth.ts'
import { trackUsage } from './utils/usage-tracking.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    // Validate authentication
    const user = await validateAuth(req)

    // Create Supabase client with service role for RLS bypass
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check premium subscription status from profiles table
    const { data: profile, error: subError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_expires_at')
      .eq('user_id', user.id)
      .single()

    // Determine if user has active premium subscription
    const expiresAt = profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at)
      : null

    const isPremium =
      profile?.subscription_tier === 'premium' &&
      profile?.subscription_status === 'active' &&
      expiresAt !== null &&
      expiresAt > new Date()

    if (subError || !isPremium) {
      return new Response(
        JSON.stringify({
          error: 'Premium subscription required for cloud transcription',
          code: 'PREMIUM_REQUIRED'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Check hourly request limit (anti-spam)
    const REQUESTS_PER_HOUR = 20
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: hourlyCount, error: hourlyError } = await supabase
      .from('transcription_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneHourAgo)

    if (hourlyError) {
      console.error('Error checking hourly limit:', hourlyError)
    } else if (hourlyCount !== null && hourlyCount >= REQUESTS_PER_HOUR) {
      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. Maximum ${REQUESTS_PER_HOUR} requests per hour.`,
          code: 'RATE_LIMIT_EXCEEDED',
          limit_type: 'hourly',
          requests_made: hourlyCount,
          limit: REQUESTS_PER_HOUR,
          retry_after: 3600 // seconds
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '3600'
          }
        }
      )
    }

    // Check daily minute limit (cost protection)
    const MAX_DAILY_MINUTES = 180 // 3 hours
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { data: dailyUsage, error: dailyError } = await supabase
      .from('transcription_usage')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .eq('success', true)
      .gte('created_at', startOfDay.toISOString())

    if (dailyError) {
      console.error('Error checking daily limit:', dailyError)
    } else if (dailyUsage) {
      const totalMinutesUsed = dailyUsage.reduce(
        (sum, record) => sum + record.duration_seconds,
        0
      ) / 60

      if (totalMinutesUsed >= MAX_DAILY_MINUTES) {
        const nextDay = new Date(startOfDay)
        nextDay.setDate(nextDay.getDate() + 1)

        return new Response(
          JSON.stringify({
            error: `Daily transcription limit reached. Maximum ${MAX_DAILY_MINUTES} minutes per day.`,
            code: 'RATE_LIMIT_EXCEEDED',
            limit_type: 'daily',
            minutes_used: Math.floor(totalMinutesUsed),
            limit_minutes: MAX_DAILY_MINUTES,
            resets_at: nextDay.toISOString()
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'X-RateLimit-Limit': MAX_DAILY_MINUTES.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': nextDay.toISOString()
            }
          }
        )
      }
    }

    // Parse form data
    const formData = await req.formData()
    const audio = formData.get('audio') as Blob
    const provider = (formData.get('provider') as string) || 'openai'
    const language = formData.get('language') as string | null

    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'Missing audio file', code: 'MISSING_AUDIO' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Validate file size (25MB limit for OpenAI)
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024 // 25MB
    if (audio.size > MAX_AUDIO_SIZE) {
      return new Response(
        JSON.stringify({
          error: 'Audio file too large. Maximum size is 25MB (~25 minutes).',
          code: 'FILE_TOO_LARGE',
          size_bytes: audio.size,
          max_size_bytes: MAX_AUDIO_SIZE
        }),
        {
          status: 413,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Transcribe based on provider
    let result
    let model = 'whisper-1'

    if (provider === 'openai') {
      result = await transcribeWithOpenAI(audio, language)
    } else {
      return new Response(
        JSON.stringify({
          error: `Unsupported provider: ${provider}`,
          code: 'UNSUPPORTED_PROVIDER'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      )
    }

    // Calculate cost: $0.006 per minute
    const costUsd = (result.duration / 60) * 0.006

    // Track usage in database
    await trackUsage(supabase, {
      userId: user.id,
      provider,
      model,
      durationSeconds: result.duration,
      costUsd,
      language,
      audioSizeBytes: audio.size,
      success: true
    })

    // Return successful response
    return new Response(
      JSON.stringify({
        text: result.text,
        duration_seconds: result.duration,
        provider,
        model,
        cost_usd: costUsd
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )

  } catch (error) {
    console.error('Transcription error:', error)

    // Try to track failed usage if we have user context
    // (This will fail if error happened before auth, which is fine)
    try {
      const formData = await req.formData()
      const audio = formData.get('audio') as Blob

      if (audio) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Re-validate to get user (might fail, that's ok)
        const user = await validateAuth(req)

        await trackUsage(supabase, {
          userId: user.id,
          provider: 'openai',
          model: 'whisper-1',
          durationSeconds: 0,
          costUsd: 0,
          language: null,
          audioSizeBytes: audio.size,
          success: false,
          errorMessage: error.message
        })
      }
    } catch {
      // Ignore errors in error tracking
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'Transcription failed',
        code: 'TRANSCRIPTION_FAILED'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})
