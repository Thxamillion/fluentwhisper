export interface OpenAITranscriptionResult {
  text: string
  duration: number // in seconds
}

export async function transcribeWithOpenAI(
  audio: Blob,
  language?: string | null
): Promise<OpenAITranscriptionResult> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured')
  }

  // Create form data with audio file
  const formData = new FormData()
  formData.append('file', audio, 'audio.webm')
  formData.append('model', 'whisper-1')

  if (language) {
    formData.append('language', language)
  }

  // Call OpenAI Whisper API
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()

  // Calculate duration from audio blob (approximate)
  // OpenAI doesn't return duration, so we estimate from file size
  // Typical WebM audio is ~16 KB/s, so duration ≈ size / 16000
  const estimatedDuration = audio.size / 16000

  return {
    text: result.text,
    duration: estimatedDuration
  }
}
