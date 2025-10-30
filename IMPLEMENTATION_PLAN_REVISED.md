# FluentWhisper - Revised Implementation Plan

## Current State Analysis

### ✅ What You Already Have

**Database (Supabase project: `fluent-prod`):**
- `profiles` table with subscription fields:
  - `subscription_tier` (free/premium)
  - `subscription_status` (active/expired/cancelled/trial)
  - `subscription_expires_at`
  - `stripe_customer_id`
  - `stripe_subscription_id`
  - `user_id` (linked to auth.users)
- `usage_tracking` table (monthly recording limits)
- `recordings`, `transcriptions` tables (core data)
- Referral system (`referral_rewards`, `referral_tracking`)

**Web/Mobile Apps:**
- Supabase Auth working
- Basic subscription structure in place

**Desktop App:**
- Tauri app with local SQLite
- No authentication yet
- No subscription checking yet

---

## What Needs to Be Added

### Phase 1: Database Updates (30 minutes)

#### 1.1 Add Missing Columns

```sql
-- Support iOS subscriptions (only 2 columns needed!)
ALTER TABLE profiles
ADD COLUMN subscription_provider TEXT
CHECK (subscription_provider IN ('stripe', 'apple'));

ALTER TABLE profiles
ADD COLUMN apple_original_transaction_id TEXT;

-- Update subscription_status constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_subscription_status_check
CHECK (subscription_status IN ('active', 'expired', 'cancelled', 'trial', 'past_due', 'inactive'));
```

**Note:** We're NOT adding `revenuecat_user_id` because RevenueCat's `app_user_id` is the same as our `user_id`. No need for a separate column!

**How to run:**
```bash
# Option A: Via Supabase Dashboard SQL Editor
# Go to: https://supabase.com/dashboard/project/xtflvvyitebirnsafvrm/editor
# Paste SQL above and run

# Option B: Via Supabase CLI
supabase db push
```

---

### Phase 2: Backend Edge Functions (1 day)

#### 2.1 Setup Supabase Functions Folder

```bash
cd /Users/quinortiz/Documents/fluentwhisper
mkdir -p supabase/functions
```

#### 2.2 Create `stripe-checkout` Function

**File:** `supabase/functions/stripe-checkout/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, user_id')
      .eq('user_id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: Deno.env.get('STRIPE_PRICE_ID'), // Monthly price
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('WEB_URL')}/dashboard?payment=success`,
      cancel_url: `${Deno.env.get('WEB_URL')}/upgrade?payment=canceled`,
      metadata: {
        supabase_user_id: user.id
      }
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### 2.3 Create `stripe-webhook` Function

**File:** `supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  console.log('Processing Stripe event:', event.type)

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      console.log('Subscription event for customer:', customerId)

      // Find user by Stripe customer ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        console.log('Updating subscription for user:', profile.user_id)

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'premium',
            subscription_status: subscription.status,
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            subscription_provider: 'stripe',
            stripe_subscription_id: subscription.id
          })
          .eq('user_id', profile.user_id)

        console.log('Subscription updated successfully')
      } else {
        console.error('No profile found for customer:', customerId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'cancelled',
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('user_id', profile.user_id)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due'
          })
          .eq('user_id', profile.user_id)
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

#### 2.4 Create `revenuecat-webhook` Function

**File:** `supabase/functions/revenuecat-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const event = await req.json()

    console.log('RevenueCat event received:', event.type)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const userId = event.app_user_id

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'NON_RENEWING_PURCHASE': {
        console.log('Processing purchase for user:', userId)

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'premium',
            subscription_status: 'active',
            subscription_expires_at: new Date(event.expiration_at_ms).toISOString(),
            subscription_provider: 'apple',
            apple_original_transaction_id: event.original_transaction_id
          })
          .eq('user_id', userId)

        // Note: We match on user_id directly since RevenueCat's app_user_id = our user_id

        console.log('iOS subscription updated')
        break
      }

      case 'CANCELLATION':
      case 'EXPIRATION': {
        console.log('Processing cancellation for user:', userId)

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'cancelled'
          })
          .eq('user_id', userId)
        break
      }

      case 'BILLING_ISSUE': {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due'
          })
          .eq('user_id', userId)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('RevenueCat webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

#### 2.5 Deploy Functions

```bash
# Link to your project
supabase link --project-ref xtflvvyitebirnsafvrm

# Set environment secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID=price_...
supabase secrets set WEB_URL=https://your-web-app.com

# Deploy functions
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy revenuecat-webhook
```

#### 2.6 Configure Webhooks

**Stripe:**
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://xtflvvyitebirnsafvrm.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret → use in `STRIPE_WEBHOOK_SECRET`

**RevenueCat (if iOS):**
1. Go to RevenueCat dashboard
2. Add webhook: `https://xtflvvyitebirnsafvrm.supabase.co/functions/v1/revenuecat-webhook`
3. Enable all subscription events

---

### Phase 3: Desktop App Auth & Subscriptions (2 days)

#### 3.1 Install Supabase Client

```bash
cd /Users/quinortiz/Documents/fluentwhisper
bun add @supabase/supabase-js
```

#### 3.2 Create Supabase Client

**File:** `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://xtflvvyitebirnsafvrm.supabase.co',
  'YOUR_SUPABASE_ANON_KEY' // Get from Supabase dashboard
)

export interface Profile {
  id: string
  user_id: string
  subscription_tier: 'free' | 'premium'
  subscription_status: 'active' | 'expired' | 'cancelled' | 'trial' | 'past_due' | 'inactive'
  subscription_expires_at: string | null
  subscription_provider: 'stripe' | 'apple' | null
}
```

#### 3.3 Configure Deep Links (Tauri)

**File:** `src-tauri/tauri.conf.json`

Update to add deep link scheme:

```json
{
  "tauri": {
    "bundle": {
      "identifier": "com.fluentwhisper.app",
      "deeplink": {
        "schemes": ["fluentwhisper"]
      }
    }
  }
}
```

#### 3.4 Rust Deep Link Handler

**File:** `src-tauri/src/main.rs`

Add these commands and setup:

```rust
use tauri::{Manager};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AuthTokens {
    access_token: String,
    refresh_token: String,
}

struct AppState {
    auth_tokens: Mutex<Option<AuthTokens>>,
}

#[tauri::command]
fn start_auth_flow() -> Result<(), String> {
    open::that("https://your-web-app.com/auth/desktop-callback")
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_auth_tokens(access_token: String, refresh_token: String, state: tauri::State<AppState>) -> Result<(), String> {
    let tokens = AuthTokens { access_token, refresh_token };
    let mut auth_tokens = state.auth_tokens.lock().unwrap();
    *auth_tokens = Some(tokens);
    Ok(())
}

#[tauri::command]
fn get_auth_tokens(state: tauri::State<AppState>) -> Result<Option<AuthTokens>, String> {
    let auth_tokens = state.auth_tokens.lock().unwrap();
    Ok(auth_tokens.clone())
}

#[tauri::command]
fn clear_auth_tokens(state: tauri::State<AppState>) -> Result<(), String> {
    let mut auth_tokens = state.auth_tokens.lock().unwrap();
    *auth_tokens = None;
    Ok(())
}

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            auth_tokens: Mutex::new(None),
        })
        .setup(|app| {
            let app_handle = app.handle();

            // Listen for deep link
            app.listen_global("deep-link", move |event| {
                if let Some(payload) = event.payload() {
                    if let Some(url) = payload.strip_prefix("fluentwhisper://auth?") {
                        let params: std::collections::HashMap<String, String> = url
                            .split('&')
                            .filter_map(|param| {
                                let mut parts = param.split('=');
                                Some((parts.next()?.to_string(), parts.next()?.to_string()))
                            })
                            .collect();

                        if let (Some(token), Some(refresh)) = (params.get("token"), params.get("refresh")) {
                            app_handle.emit_all("auth-success", serde_json::json!({
                                "access_token": token,
                                "refresh_token": refresh
                            })).unwrap();
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_auth_flow,
            save_auth_tokens,
            get_auth_tokens,
            clear_auth_tokens,
            open_url,
            // ... your existing commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Add dependency to `Cargo.toml`:
```toml
[dependencies]
open = "5.0"
```

#### 3.5 Desktop Auth Service

**File:** `src/services/auth/desktop-auth.service.ts`

```typescript
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { supabase } from '@/lib/supabase'

export class DesktopAuthService {
  static async signIn(): Promise<void> {
    await invoke('start_auth_flow')

    return new Promise((resolve, reject) => {
      const unlisten = listen('auth-success', async (event: any) => {
        try {
          const { access_token, refresh_token } = event.payload

          await invoke('save_auth_tokens', {
            accessToken: access_token,
            refreshToken: refresh_token
          })

          await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          unlisten()
          resolve()
        } catch (error) {
          unlisten()
          reject(error)
        }
      })

      setTimeout(() => {
        unlisten()
        reject(new Error('Authentication timeout'))
      }, 5 * 60 * 1000)
    })
  }

  static async signOut(): Promise<void> {
    await supabase.auth.signOut()
    await invoke('clear_auth_tokens')
  }

  static async getSession() {
    const { data: { session } } = await supabase.auth.getSession()

    if (session) return session

    try {
      const tokens: any = await invoke('get_auth_tokens')

      if (tokens) {
        const { data } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token
        })
        return data.session
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
    }

    return null
  }
}
```

#### 3.6 Desktop Subscription Service (Read-Only)

**File:** `src/services/subscription/desktop-subscription.service.ts`

```typescript
import { invoke } from '@tauri-apps/api/tauri'
import { supabase } from '@/lib/supabase'

export interface SubscriptionStatus {
  isPremium: boolean
  status: string
  expiresAt: Date | null
  provider: 'stripe' | 'apple' | null
}

const CACHE_KEY = 'subscription_status'
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7 // 7 days

export class DesktopSubscriptionService {
  static async getStatus(): Promise<SubscriptionStatus> {
    try {
      const session = await supabase.auth.getSession()

      if (!session.data.session) {
        throw new Error('Not authenticated')
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_expires_at, subscription_provider')
        .eq('user_id', session.data.session.user.id)
        .single()

      const expiresAt = profile?.subscription_expires_at
        ? new Date(profile.subscription_expires_at)
        : null

      const status: SubscriptionStatus = {
        isPremium:
          profile?.subscription_tier === 'premium' &&
          profile?.subscription_status === 'active' &&
          expiresAt !== null &&
          expiresAt > new Date(),
        status: profile?.subscription_status || 'inactive',
        expiresAt,
        provider: profile?.subscription_provider || null
      }

      await this.cacheStatus(status)
      return status
    } catch (error) {
      console.error('Online subscription check failed:', error)
      return await this.getCachedStatus()
    }
  }

  private static async cacheStatus(status: SubscriptionStatus): Promise<void> {
    const cacheData = {
      status,
      cachedAt: new Date().toISOString()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  }

  private static async getCachedStatus(): Promise<SubscriptionStatus> {
    const cached = localStorage.getItem(CACHE_KEY)

    if (!cached) {
      return {
        isPremium: false,
        status: 'inactive',
        expiresAt: null,
        provider: null
      }
    }

    const { status, cachedAt } = JSON.parse(cached)
    const cacheAge = Date.now() - new Date(cachedAt).getTime()

    if (cacheAge > CACHE_DURATION) {
      return {
        isPremium: false,
        status: 'expired',
        expiresAt: status.expiresAt,
        provider: status.provider
      }
    }

    return status
  }

  static async openUpgradePage(): Promise<void> {
    await invoke('open_url', { url: 'https://your-web-app.com/upgrade' })
  }
}
```

#### 3.7 React Hooks

**File:** `src/hooks/useAuth.ts`

```typescript
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DesktopAuthService } from '@/services/auth/desktop-auth.service'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    DesktopAuthService.getSession().then(session => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInMutation = useMutation({
    mutationFn: () => DesktopAuthService.signIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    }
  })

  const signOutMutation = useMutation({
    mutationFn: () => DesktopAuthService.signOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    }
  })

  return {
    user,
    loading,
    signIn: signInMutation.mutate,
    signOut: signOutMutation.mutate,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending
  }
}
```

**File:** `src/hooks/useSubscription.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { DesktopSubscriptionService } from '@/services/subscription/desktop-subscription.service'
import { useAuth } from './useAuth'

export function useSubscription() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => DesktopSubscriptionService.getStatus(),
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1
  })
}
```

#### 3.8 UI Components

**File:** `src/components/LoginScreen.tsx`

```typescript
import { useAuth } from '@/hooks/useAuth'

export function LoginScreen() {
  const { signIn, isSigningIn } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2">FluentWhisper</h1>
        <p className="text-gray-600 text-center mb-8">
          Sign in to sync across devices
        </p>
        <button
          onClick={() => signIn()}
          disabled={isSigningIn}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {isSigningIn ? 'Opening browser...' : 'Sign In with Browser'}
        </button>
      </div>
    </div>
  )
}
```

**File:** `src/components/PremiumFeature.tsx`

```typescript
import { useSubscription } from '@/hooks/useSubscription'
import { DesktopSubscriptionService } from '@/services/subscription/desktop-subscription.service'
import { ExternalLink } from 'lucide-react'

interface Props {
  children: React.ReactNode
  featureName?: string
}

export function PremiumFeature({ children, featureName = 'This feature' }: Props) {
  const { data: subscription, isLoading, refetch } = useSubscription()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!subscription?.isPremium) {
    return (
      <div className="border-2 border-blue-200 rounded-lg p-8 text-center bg-blue-50">
        <h3 className="text-xl font-bold mb-2">Premium Feature</h3>
        <p className="text-gray-600 mb-4">
          {featureName} requires Premium
        </p>
        <div className="space-y-3">
          <button
            onClick={() => DesktopSubscriptionService.openUpgradePage()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Upgrade on Web
            <ExternalLink size={16} />
          </button>
          <button
            onClick={() => refetch()}
            className="block w-full text-sm text-blue-600 hover:text-blue-700"
          >
            I just upgraded, check again
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

---

### Phase 4: Web App Desktop Callback (1 hour)

Add this route to your existing web app:

**File:** `app/auth/desktop-callback/page.tsx` (or equivalent)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DesktopCallback() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')

  useEffect(() => {
    async function handleAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          window.location.href = '/login?return=desktop'
          return
        }

        const deepLink = `fluentwhisper://auth?token=${session.access_token}&refresh=${session.refresh_token}`
        setStatus('success')
        window.location.href = deepLink
      } catch (error) {
        console.error(error)
        setStatus('error')
      }
    }

    handleAuth()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {status === 'checking' && <p>Signing you in...</p>}
        {status === 'success' && <p>Redirecting to desktop app...</p>}
        {status === 'error' && <p>Error signing in</p>}
      </div>
    </div>
  )
}
```

---

## Testing Checklist

- [ ] Database columns added successfully
- [ ] Edge Functions deployed
- [ ] Stripe webhook receiving events (test in Stripe dashboard)
- [ ] Desktop can open browser for sign-in
- [ ] Desktop receives deep link callback
- [ ] Desktop session persists after restart
- [ ] Desktop shows correct subscription status
- [ ] Offline mode uses cached status
- [ ] "Upgrade on Web" button opens browser
- [ ] Web purchase updates desktop status

---

## Environment Variables

**Desktop (.env):**
```bash
VITE_SUPABASE_URL=https://xtflvvyitebirnsafvrm.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Supabase Secrets:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
WEB_URL=https://your-web-app.com
```

---

## Timeline

| Task | Time |
|------|------|
| Add database columns | 30 min |
| Create Edge Functions | 3 hours |
| Deploy & configure webhooks | 1 hour |
| Desktop Supabase integration | 2 hours |
| Desktop auth with deep links | 4 hours |
| Desktop subscription service | 2 hours |
| UI components | 2 hours |
| Testing | 2 hours |
| **Total** | **~2 days** |

---

## Next Steps

1. Add the missing columns to your database
2. Create the Edge Functions
3. Install Supabase in desktop app
4. Implement auth flow
5. Test end-to-end

Much simpler than starting from scratch! 🎉
