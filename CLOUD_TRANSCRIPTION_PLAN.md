# Cloud Transcription Implementation Plan

## Overview
Add cloud-based transcription (OpenAI Whisper API) as a premium feature with unified model selection UX.

**Economics:**
- Cost: $0.006/minute
- Price: $10/month subscription
- Break-even: 1,667 minutes/month (~56 min/day)
- Average user: $2-5/month cost, $5-8 profit
- **Offering: UNLIMITED cloud transcription for premium users**

---

## Architecture

### Model Selection
```
┌─ Transcription Model ──────────────────────┐
│ Model: [Base (Local) ▼]                    │
│   Local Models:                             │
│     • Tiny (39MB, fastest)                  │
│     • Base (74MB, recommended) ✓           │
│     • Small (244MB)                         │
│     • Medium (769MB)                        │
│     • Large (1.5GB, best local)            │
│   ──────────────────────                    │
│   Cloud Models (Premium):                   │
│     • ☁️ OpenAI Whisper (best accuracy)    │
└─────────────────────────────────────────────┘
```

### Settings Schema
```typescript
export interface AppSettings {
  // Model selection - can be:
  //   Local: 'tiny', 'base', 'small', 'medium', 'large'
  //   Cloud: 'openai-whisper'
  //   Empty: '' (not configured yet - forces onboarding)
  selectedModel: string

  // Other settings...
}

// Helper function
export function isCloudModel(modelName: string): boolean {
  return modelName.startsWith('openai-') ||
         modelName.startsWith('assemblyai-') ||
         modelName.startsWith('google-')
}
```

### Data Flow

**Local Transcription:**
```
User speaks → AudioRecorder → Rust transcribe command → Whisper model → Text
```

**Cloud Transcription:**
```
User speaks → AudioRecorder → Edge Function → OpenAI API → Text → Usage tracking
```

---

## Database Schema

### Usage Tracking Table
```sql
create table public.transcription_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Transcription details
  provider text not null check (provider in ('openai', 'assemblyai', 'google')),
  model text not null,
  duration_seconds decimal(10, 2) not null,

  -- Cost tracking
  cost_usd decimal(10, 6) not null,

  -- Metadata
  language text,
  audio_size_bytes bigint,
  success boolean not null default true,
  error_message text,

  -- Timestamps
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_transcription_usage_user_id on public.transcription_usage(user_id);
create index idx_transcription_usage_created_at on public.transcription_usage(created_at);

-- RLS Policies
alter table public.transcription_usage enable row level security;

create policy "Users can view their own usage"
  on public.transcription_usage
  for select
  using (auth.uid() = user_id);

create policy "Service role can insert usage"
  on public.transcription_usage
  for insert
  with check (true); -- Edge function uses service role
```

---

## Edge Function Structure

```
supabase/functions/transcribe/
├── index.ts                 # Main handler
├── providers/
│   └── openai.ts           # OpenAI Whisper API integration
├── utils/
│   ├── auth.ts             # JWT validation
│   ├── rate-limit.ts       # Rate limiting (future)
│   └── usage-tracking.ts   # Database logging
└── types.ts                # Shared types
```

### API Specification

**Endpoint:**
```
POST https://xtflvvyitebirnsafvrm.supabase.co/functions/v1/transcribe
```

**Request:**
```typescript
Headers:
  Authorization: Bearer <user_jwt>
  Content-Type: multipart/form-data

Body (FormData):
  audio: Blob           // Audio file
  provider: 'openai'    // Provider name
  language?: string     // Optional language hint
```

**Response (Success):**
```json
{
  "text": "Transcribed text here...",
  "duration_seconds": 45.2,
  "provider": "openai",
  "model": "whisper-1",
  "cost_usd": 0.271
}
```

**Response (Error):**
```json
{
  "error": "Subscription required",
  "code": "PREMIUM_REQUIRED"
}
```

---

## Implementation Tasks

### Phase 1: Database & Settings (30 min)
- [x] Update settings schema (`selectedModel: ''`)
- [ ] Create usage tracking migration
- [ ] Test migration on dev database

### Phase 2: UI Components (45 min)
- [ ] Create `UnifiedModelDropdown` component
  - Local models (with download status)
  - Premium-gated cloud models
  - Show cloud icon for cloud models
- [ ] Update Settings page to use new dropdown
- [ ] Remove old cloud toggle UI
- [ ] Add onboarding check to App.tsx

### Phase 3: Edge Function (60 min)
- [ ] Set up Edge Function project structure
- [ ] Implement OpenAI provider
- [ ] Add JWT auth validation
- [ ] Add premium subscription check
- [ ] Add usage tracking
- [ ] Deploy and test

### Phase 4: Desktop Integration (45 min)
- [ ] Create `CloudTranscriptionService.ts`
  - Upload audio to Edge Function
  - Handle errors
  - Return transcribed text
- [ ] Update Record page logic
  - Check if cloud model selected
  - Route to cloud service or local Rust command
- [ ] Update ReadAloud page (same logic)
- [ ] Update Import page (same logic)

### Phase 5: Visual Polish (30 min)
- [ ] Create `TranscriptionBadge` component
  - Shows "☁️ Cloud" or "💻 Local"
  - Shows current model name
- [ ] Add badge to Record/ReadAloud/Import pages
- [ ] Add loading states for cloud transcription
- [ ] Add error handling UI

---

## Code Examples

### Unified Model Dropdown Component
```typescript
export function UnifiedModelDropdown() {
  const { settings, updateSetting } = useSettings()
  const { data: subscription } = useSubscription()
  const { data: installedModels } = useInstalledModels()

  const localModels = [
    { id: 'tiny', name: 'Tiny', size: '39MB', speed: 'fastest' },
    { id: 'base', name: 'Base', size: '74MB', speed: 'recommended' },
    { id: 'small', name: 'Small', size: '244MB', speed: 'good' },
    { id: 'medium', name: 'Medium', size: '769MB', speed: 'better' },
    { id: 'large', name: 'Large', size: '1.5GB', speed: 'best local' },
  ]

  const cloudModels = [
    { id: 'openai-whisper', name: 'OpenAI Whisper', premium: true }
  ]

  return (
    <select value={settings.selectedModel} onChange={(e) => updateSetting('selectedModel', e.target.value)}>
      <optgroup label="Local Models">
        {localModels.map(model => {
          const isInstalled = installedModels?.some(m => m.name === model.id)
          return (
            <option key={model.id} value={model.id} disabled={!isInstalled}>
              {model.name} ({model.size}) {isInstalled ? '✓' : '⬇ Download first'}
            </option>
          )
        })}
      </optgroup>

      <optgroup label="Cloud Models (Premium)">
        {cloudModels.map(model => (
          <option
            key={model.id}
            value={model.id}
            disabled={!subscription?.isPremium}
          >
            ☁️ {model.name} {!subscription?.isPremium && '(Premium only)'}
          </option>
        ))}
      </optgroup>
    </select>
  )
}
```

### Transcription Logic (Record page)
```typescript
async function transcribeAudio(audioBlob: Blob) {
  const { settings } = useSettings()

  if (isCloudModel(settings.selectedModel)) {
    // Cloud transcription
    return await CloudTranscriptionService.transcribe(audioBlob, {
      provider: 'openai',
      language: settings.primaryLanguage
    })
  } else {
    // Local transcription
    return await invoke('whisper_transcribe', {
      audio: await audioBlob.arrayBuffer(),
      model: settings.selectedModel
    })
  }
}
```

---

## Edge Function Implementation

### index.ts
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { transcribeWithOpenAI } from './providers/openai.ts'
import { validateAuth } from './utils/auth.ts'
import { trackUsage } from './utils/usage-tracking.ts'

serve(async (req) => {
  try {
    // Validate auth and get user
    const user = await validateAuth(req)

    // Check premium subscription
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: subscription } = await supabase
      .from('user_subscription_status')
      .select('is_premium')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.is_premium) {
      return new Response(
        JSON.stringify({ error: 'Premium subscription required', code: 'PREMIUM_REQUIRED' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const audio = formData.get('audio') as Blob
    const provider = formData.get('provider') as string
    const language = formData.get('language') as string | null

    // Transcribe
    const startTime = Date.now()
    const result = await transcribeWithOpenAI(audio, language)
    const duration = (Date.now() - startTime) / 1000

    // Track usage
    await trackUsage(supabase, {
      userId: user.id,
      provider: 'openai',
      model: 'whisper-1',
      durationSeconds: result.duration,
      costUsd: result.duration * 0.006 / 60, // $0.006 per minute
      language: language,
      audioSizeBytes: audio.size,
      success: true
    })

    return new Response(
      JSON.stringify({
        text: result.text,
        duration_seconds: result.duration,
        provider: 'openai',
        model: 'whisper-1',
        cost_usd: result.duration * 0.006 / 60
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Transcription error:', error)
    return new Response(
      JSON.stringify({ error: error.message, code: 'TRANSCRIPTION_FAILED' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Testing Strategy

1. **Dev Auth Panel Testing:**
   - Test as Guest (no cloud models available)
   - Test as Free User (no cloud models available)
   - Test as Premium User (cloud models unlocked)

2. **Model Switching:**
   - Switch between local models
   - Switch to cloud model (premium only)
   - Verify correct service is called

3. **Usage Tracking:**
   - Verify usage is logged to database
   - Check cost calculation accuracy
   - Verify RLS policies work

4. **Error Handling:**
   - Test with no internet (cloud should fail gracefully)
   - Test with expired subscription (should block cloud)
   - Test with invalid audio file

---

## Future Enhancements

1. **Additional Providers (15 min each):**
   - AssemblyAI Universal-1
   - Google Chirp 2

2. **Usage Dashboard:**
   - Show user their monthly usage
   - Cost breakdown by provider
   - Usage graphs

3. **Rate Limiting:**
   - Prevent abuse (e.g., max 10 hours/month)
   - Soft limits with warnings

4. **Model-specific Options:**
   - Temperature, prompt, etc. for OpenAI
   - Provider-specific settings

---

## Questions & Decisions

- [x] UI Design: Option B (Unified dropdown)
- [x] Provider: Start with OpenAI only
- [x] Model dropdown: Show in unified dropdown with cloud icon
- [x] Usage tracking: Yes, track in database
- [x] Default model: Empty string (forces onboarding)

---

## Timeline Estimate

- Phase 1 (Database & Settings): **30 min**
- Phase 2 (UI Components): **45 min**
- Phase 3 (Edge Function): **60 min**
- Phase 4 (Desktop Integration): **45 min**
- Phase 5 (Visual Polish): **30 min**

**Total: ~3.5 hours**
