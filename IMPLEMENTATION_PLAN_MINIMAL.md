# FluentWhisper - Minimal Desktop Integration Plan

## What You're Actually Building

**Goal**: Add desktop app to your existing web/mobile ecosystem with shared authentication and subscription checking.

**Current State**:
- ✅ Web app with Stripe subscriptions (working)
- ✅ Mobile app with RevenueCat subscriptions (working)
- ✅ Supabase backend with `profiles` table
- ❌ Desktop app has no auth or subscription checking

**What Desktop Needs**:
- Sign in via browser (deep link auth)
- Check subscription status (read-only)
- Show "Upgrade on Web" for free users
- No payment processing in desktop app

---

## Timeline: ~1 Day of Work

| Task | Time |
|------|------|
| Add 2 database columns | 5 min |
| Update existing code | 30 min |
| Desktop Supabase setup | 1 hour |
| Desktop auth (deep links) | 3 hours |
| Desktop subscription checking | 2 hours |
| Testing | 1 hour |
| **Total** | **~1 day** |

---

## Phase 1: Backend Updates (30 minutes)

### 1.1 Add 2 Database Columns

**Why**: Track which platform users paid on (for support/analytics).

```sql
-- Add to profiles table
ALTER TABLE profiles
ADD COLUMN subscription_provider TEXT CHECK (subscription_provider IN ('stripe', 'apple'));

ALTER TABLE profiles
ADD COLUMN apple_original_transaction_id TEXT;

-- Update subscription_status constraint (add new statuses)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_subscription_status_check
CHECK (subscription_status IN ('active', 'expired', 'cancelled', 'trial', 'past_due', 'inactive'));
```

**How to run**:
```bash
# Option A: Supabase Dashboard SQL Editor
# Go to: https://supabase.com/dashboard/project/xtflvvyitebirnsafvrm/editor
# Paste SQL and click "Run"

# Option B: Supabase CLI (if you have local migrations)
supabase db push
```

---

### 1.2 Update Existing Stripe Webhook

**File**: Your existing Edge Function at `supabase/functions/stripe-webhook/index.ts`

**Current code** (around line 96):
```typescript
await supabase.from('profiles').update({
  stripe_customer_id: customerId,
  subscription_tier: 'premium',
  subscription_status: 'active'
}).eq('user_id', userId);
```

**Add one line**:
```typescript
await supabase.from('profiles').update({
  stripe_customer_id: customerId,
  subscription_tier: 'premium',
  subscription_status: 'active',
  subscription_provider: 'stripe'  // ← ADD THIS LINE
}).eq('user_id', userId);
```

**Also update** (around line 161):
```typescript
await supabase.from('profiles').update({
  stripe_subscription_id: subscription.id,
  subscription_tier: subscriptionTier,
  subscription_status: subscriptionStatus,
  subscription_expires_at: currentPeriodEnd,
  subscription_provider: 'stripe'  // ← ADD THIS LINE
}).eq('stripe_customer_id', customerId);
```

**Redeploy**:
```bash
supabase functions deploy stripe-webhook
```

---

### 1.3 Update Mobile Sync Code

**File**: `/Users/quinortiz/Downloads/Fluent/shared/lib/subscriptionService.ts` (line 69-133)

**Current code**:
```typescript
const updateData = {
  subscription_tier: subscriptionInfo.isPremium ? 'premium' : 'free',
  subscription_expires_at: subscriptionInfo.expirationDate,
  subscription_status: subscriptionInfo.isPremium ? 'active' : 'expired'
};
```

**Update to**:
```typescript
const updateData = {
  subscription_tier: subscriptionInfo.isPremium ? 'premium' : 'free',
  subscription_expires_at: subscriptionInfo.expirationDate,
  subscription_status: subscriptionInfo.isPremium ? 'active' : 'expired',
  subscription_provider: 'apple',  // ← ADD THIS
  apple_original_transaction_id: customerInfo.originalPurchaseDate  // ← ADD THIS
};
```

**Note**: You'll need to get the transaction ID from customerInfo. RevenueCat's `CustomerInfo` object should have it.

---

## Phase 2: Desktop App Setup (4 hours)

### 2.1 Install Dependencies

```bash
cd /Users/quinortiz/Documents/fluentwhisper
bun add @supabase/supabase-js
```

Add to `src-tauri/Cargo.toml`:
```toml
[dependencies]
open = "5.0"
```

---

### 2.2 Create Supabase Client

**File**: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface SubscriptionStatus {
  isPremium: boolean
  status: string
  expiresAt: Date | null
  provider: 'stripe' | 'apple' | null
}
```

**File**: `.env` (create if doesn't exist)

```bash
VITE_SUPABASE_URL=https://xtflvvyitebirnsafvrm.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

Get anon key from: https://supabase.com/dashboard/project/xtflvvyitebirnsafvrm/settings/api

---

### 2.3 Configure Deep Links (Tauri)

**File**: `src-tauri/tauri.conf.json`

Add deep link configuration:

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

---

### 2.4 Rust Backend - Auth Commands

**File**: `src-tauri/src/main.rs`

Add these imports at the top:
```rust
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
```

Add state structure (before main function):
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
struct AuthTokens {
    access_token: String,
    refresh_token: String,
}

struct AppState {
    auth_tokens: Mutex<Option<AuthTokens>>,
}
```

Add commands (before main function):
```rust
#[tauri::command]
fn start_auth_flow() -> Result<(), String> {
    open::that("https://your-web-app.com/auth/desktop-callback")
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_auth_tokens(
    access_token: String,
    refresh_token: String,
    state: tauri::State<AppState>
) -> Result<(), String> {
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
```

Update main function:
```rust
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

---

### 2.5 Desktop Auth Service

**File**: `src/services/auth/desktop-auth.service.ts`

```typescript
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { supabase } from '@/lib/supabase'

export class DesktopAuthService {
  static async signIn(): Promise<void> {
    // Opens browser
    await invoke('start_auth_flow')

    // Wait for deep link callback
    return new Promise((resolve, reject) => {
      const unlisten = listen('auth-success', async (event: any) => {
        try {
          const { access_token, refresh_token } = event.payload

          // Save tokens in Rust
          await invoke('save_auth_tokens', {
            accessToken: access_token,
            refreshToken: refresh_token
          })

          // Set session in Supabase
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

      // Timeout after 5 minutes
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

    // Try to restore from stored tokens
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

---

### 2.6 Desktop Subscription Service (Read-Only)

**File**: `src/services/subscription/desktop-subscription.service.ts`

```typescript
import { invoke } from '@tauri-apps/api/tauri'
import { supabase, SubscriptionStatus } from '@/lib/supabase'

const CACHE_KEY = 'subscription_status'
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7 // 7 days offline grace

export class DesktopSubscriptionService {
  static async getStatus(): Promise<SubscriptionStatus> {
    try {
      // Try online check
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

      // Cache result
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        status,
        cachedAt: new Date().toISOString()
      }))

      return status
    } catch (error) {
      console.error('Online check failed, using cache:', error)
      return this.getCachedStatus()
    }
  }

  private static getCachedStatus(): SubscriptionStatus {
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

    // Grace period expired
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

---

### 2.7 React Hooks

**File**: `src/hooks/useAuth.ts`

```typescript
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DesktopAuthService } from '@/services/auth/desktop-auth.service'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    // Restore session on mount
    DesktopAuthService.getSession().then(session => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
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

**File**: `src/hooks/useSubscription.ts`

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

---

### 2.8 UI Components

**File**: `src/components/LoginScreen.tsx`

```typescript
import { useAuth } from '@/hooks/useAuth'

export function LoginScreen() {
  const { signIn, isSigningIn } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2">FluentWhisper</h1>
        <p className="text-gray-600 text-center mb-8">
          Sign in to sync your progress
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

**File**: `src/components/PremiumFeature.tsx`

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

  if (isLoading) return <div>Loading...</div>

  if (!subscription?.isPremium) {
    return (
      <div className="border-2 border-blue-200 rounded-lg p-8 text-center bg-blue-50">
        <h3 className="text-xl font-bold mb-2">Premium Feature</h3>
        <p className="text-gray-600 mb-4">{featureName} requires Premium</p>
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

## Phase 3: Web App Update (30 minutes)

### 3.1 Add Desktop Auth Callback Page

**File**: Your web app - add route `/auth/desktop-callback`

If using Next.js App Router:
```typescript
// app/auth/desktop-callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase' // Your existing Supabase client

export default function DesktopCallback() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')

  useEffect(() => {
    async function handleAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          // Not logged in - redirect to login
          window.location.href = '/login?return=desktop'
          return
        }

        // Create deep link
        const deepLink = `fluentwhisper://auth?token=${session.access_token}&refresh=${session.refresh_token}`

        setStatus('success')

        // Redirect to desktop
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
        {status === 'checking' && <p>Signing you in to FluentWhisper Desktop...</p>}
        {status === 'success' && (
          <div>
            <p className="mb-4">Success! Redirecting to desktop app...</p>
            <p className="text-sm text-gray-500">
              If the app doesn't open, please return to the desktop application.
            </p>
          </div>
        )}
        {status === 'error' && (
          <div>
            <p className="text-red-600 mb-4">Something went wrong</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

If using Next.js Pages Router:
```typescript
// pages/auth/desktop-callback.tsx
// Same code, just different file location
```

---

## Phase 4: Testing (1 hour)

### Test Checklist

**Backend:**
- [ ] Database columns added (check in Supabase dashboard)
- [ ] Stripe webhook updated and redeployed
- [ ] Mobile code updated (in Fluent project)

**Desktop - Auth:**
- [ ] Deep link registered: `open fluentwhisper://auth?token=test` works
- [ ] "Sign In" opens browser
- [ ] Web callback redirects back to desktop
- [ ] Desktop receives tokens
- [ ] Session persists after app restart

**Desktop - Subscription:**
- [ ] Logged-in user sees correct subscription status
- [ ] Premium user sees premium features
- [ ] Free user sees upgrade prompt
- [ ] "Upgrade on Web" opens browser
- [ ] "Refresh" button updates status
- [ ] Offline mode uses cache (disconnect internet, check status)

**Integration:**
- [ ] User purchases on web → Desktop sees premium
- [ ] User purchases on mobile → Desktop sees premium
- [ ] User cancels → Desktop sees free tier

---

## Usage Examples

### Check if User Has Premium (Desktop)

```typescript
import { useSubscription } from '@/hooks/useSubscription'

function MyComponent() {
  const { data: subscription, isLoading } = useSubscription()

  if (isLoading) return <div>Loading...</div>

  if (subscription?.isPremium) {
    return <UnlimitedTranscription />
  }

  return <UpgradePrompt />
}
```

### Gate Premium Features

```typescript
import { PremiumFeature } from '@/components/PremiumFeature'

function TranscriptionPage() {
  return (
    <PremiumFeature featureName="Unlimited transcription">
      <TranscriptionButton />
    </PremiumFeature>
  )
}
```

### Show Subscription Info

```typescript
import { useSubscription } from '@/hooks/useSubscription'

function AccountPage() {
  const { data: subscription } = useSubscription()

  return (
    <div>
      <h2>Subscription Status</h2>
      <p>Tier: {subscription?.isPremium ? 'Premium' : 'Free'}</p>
      <p>Provider: {subscription?.provider || 'None'}</p>
      {subscription?.expiresAt && (
        <p>Expires: {subscription.expiresAt.toLocaleDateString()}</p>
      )}
    </div>
  )
}
```

---

## Environment Variables Summary

**Desktop (`.env`):**
```bash
VITE_SUPABASE_URL=https://xtflvvyitebirnsafvrm.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Web app already has these** - just make sure desktop uses the same project!

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Backend                     │
│                                                         │
│  profiles table:                                        │
│    ├─ subscription_tier (free/premium)                 │
│    ├─ subscription_status (active/expired/cancelled)   │
│    ├─ subscription_expires_at                          │
│    ├─ subscription_provider (stripe/apple) ← NEW       │
│    ├─ apple_original_transaction_id ← NEW              │
│    ├─ stripe_customer_id                               │
│    └─ stripe_subscription_id                           │
└─────────────────────────────────────────────────────────┘
                            ▲
                            │ All platforms read from here
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼───────┐
│   Web App      │  │  Desktop App   │  │  Mobile App  │
│                │  │                │  │              │
│ Stripe         │  │ NO PAYMENTS    │  │ RevenueCat   │
│ ↓              │  │ Just checks    │  │ ↓            │
│ Updates DB via │  │ subscription   │  │ Updates DB   │
│ webhook        │  │ status         │  │ client-side  │
└────────────────┘  └────────────────┘  └──────────────┘
```

---

## Future Enhancements (Optional)

These work fine as-is, but could be improved later:

### 1. RevenueCat Webhook (Medium Priority)
**Current**: Mobile app updates database directly after purchase
**Improvement**: Add server-side webhook for more reliability

**Why**:
- Guarantees subscription renewals are captured
- Server-side validation
- Catches edge cases (network failures, etc.)

**When**: If you notice subscription issues or want more reliability

---

### 2. Persistent Token Storage (Low Priority)
**Current**: Tokens stored in Rust Mutex (memory only)
**Improvement**: Use `tauri-plugin-store` for disk persistence

**Why**: Tokens survive app crashes/force quits

**When**: If users complain about frequent sign-ins

---

### 3. Subscription Sync Service (Low Priority)
**Current**: Each platform updates independently
**Improvement**: Background sync service

**Why**: Ensures all platforms stay in sync

**When**: If you notice sync delays between platforms

---

## Support & Troubleshooting

### User Can't Sign In on Desktop
1. Check web app `/auth/desktop-callback` route exists
2. Verify deep link registered: `open fluentwhisper://auth?token=test`
3. Check browser allows deep link redirects

### Subscription Status Not Updating
1. Check Supabase connection (VITE_SUPABASE_URL correct?)
2. Verify user_id matches between platforms
3. Check RLS policies allow reads

### "Upgrade on Web" Button Doesn't Work
1. Update URL in `DesktopSubscriptionService.openUpgradePage()`
2. Make sure URL is your actual web app

### Offline Mode Shows "Expired"
1. Check localStorage for cached status
2. Verify CACHE_DURATION (currently 7 days)
3. Clear cache and re-authenticate

---

## What You're NOT Building

Just to be clear, you're **skipping**:
- ❌ Desktop payment processing (users upgrade on web)
- ❌ RevenueCat webhook (mobile client-side sync works fine)
- ❌ New Stripe integration (you already have one)
- ❌ Customer portal in desktop (link to web instead)
- ❌ Subscription management UI (use existing web app)

Desktop is **read-only** for subscriptions. This keeps it simple and secure.

---

## Success Criteria

✅ User can sign in on desktop via browser
✅ Desktop shows correct subscription status (premium/free)
✅ Desktop premium features respect subscription
✅ Free users can click "Upgrade" and it opens web
✅ Premium features work offline for 7 days
✅ Subscription syncs across web/mobile/desktop
✅ Support can see which platform user paid on

**Time to implement: ~1 day**
**Maintenance: Minimal (read-only subscription checking)**

---

## Ready to Start?

The plan is now:
1. Small database changes (30 min)
2. Desktop integration (4 hours)
3. Web callback page (30 min)
4. Testing (1 hour)

**Total: ~1 day of focused work**

Want me to help you start with the database updates?
