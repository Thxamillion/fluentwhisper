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

    // Check premium subscription status
    const { data: subscription, error: subError } = await supabase
      .from('user_subscription_status')
      .select('is_premium')
      .eq('user_id', user.id)
      .single()

    if (subError || !subscription?.is_premium) {
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
