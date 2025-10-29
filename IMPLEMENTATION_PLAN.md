# FluentWhisper - Authentication & Subscription Implementation Plan

## Overview

This document outlines the implementation plan for:
1. **Cross-platform authentication** using deep links (desktop ↔ web sync)
2. **Subscription management** across web (Stripe) and iOS (RevenueCat)
3. **Read-only subscription checking** on desktop (no payments in desktop app)

---

## Architecture Summary

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Web App    │  │ Desktop App  │  │  iOS App     │
│              │  │              │  │              │
│ Auth: Yes    │  │ Auth: Deep   │  │ Auth: Yes    │
│ Payment: Yes │  │ Payment: No  │  │ Payment: Yes │
│ (Stripe)     │  │ (Read-only)  │  │ (RevenueCat) │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
              ┌──────────▼──────────┐
              │  Supabase Backend   │
              │  - Auth             │
              │  - Profiles table   │
              │  - Edge Functions   │
              └──────────┬──────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐           ┌─────────▼────────┐
│ Stripe Webhook  │           │ RC Webhook       │
│ (from web)      │           │ (from iOS)       │
└─────────────────┘           └──────────────────┘
```

---

## Phase 1: Backend Setup (Supabase)

### 1.1 Create Supabase Project

- [ ] Create new Supabase project
- [ ] Note down: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Configure authentication providers (email, Google, Apple, etc.)

### 1.2 Database Schema

```sql
-- profiles table (unified user data)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Subscription fields (platform-agnostic)
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'inactive', 'expired')),
  subscription_expires_at TIMESTAMPTZ,
  subscription_provider TEXT CHECK (subscription_provider IN ('stripe', 'apple', NULL)),

  -- Stripe (web only)
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- RevenueCat (iOS only)
  revenuecat_user_id TEXT,
  apple_original_transaction_id TEXT
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE handle_new_user();
```

**Files to create:**
- `supabase/migrations/001_create_profiles_table.sql`

### 1.3 Supabase Edge Functions

#### Function 1: Stripe Checkout

```typescript
// supabase/functions/stripe-checkout/index.ts
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
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: { supabase_user_id: user.id }
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: Deno.env.get('STRIPE_PRICE_ID'), // Your price ID
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

#### Function 2: Stripe Webhook

```typescript
// supabase/functions/stripe-webhook/index.ts
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
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Find user by Stripe customer ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'premium',
            subscription_status: subscription.status,
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            subscription_provider: 'stripe',
            stripe_subscription_id: subscription.id
          })
          .eq('id', profile.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('id', profile.id)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due'
          })
          .eq('id', profile.id)
      }
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

#### Function 3: RevenueCat Webhook

```typescript
// supabase/functions/revenuecat-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const event = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const userId = event.app_user_id

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'NON_RENEWING_PURCHASE': {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'premium',
            subscription_status: 'active',
            subscription_expires_at: new Date(event.expiration_at_ms).toISOString(),
            subscription_provider: 'apple',
            revenuecat_user_id: userId,
            apple_original_transaction_id: event.original_transaction_id
          })
          .eq('id', userId)
        break
      }

      case 'CANCELLATION':
      case 'EXPIRATION': {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled'
          })
          .eq('id', userId)
        break
      }

      case 'BILLING_ISSUE': {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due'
          })
          .eq('id', userId)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Files to create:**
- `supabase/functions/stripe-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/revenuecat-webhook/index.ts`

**Deploy commands:**
```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook
supabase functions deploy revenuecat-webhook
```

**Environment variables to set:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID=price_...
supabase secrets set WEB_URL=https://fluentwhisper.com
```

---

## Phase 2: Web App Implementation

### 2.1 Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types
export interface Profile {
  id: string
  email: string
  subscription_tier: 'free' | 'premium'
  subscription_status: 'active' | 'past_due' | 'canceled' | 'inactive' | 'expired'
  subscription_expires_at: string | null
  subscription_provider: 'stripe' | 'apple' | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}
```

**Files to create:**
- `lib/supabase.ts`

### 2.2 Authentication Service

```typescript
// services/auth/auth.service.ts
import { supabase } from '@/lib/supabase'

export class AuthService {
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  static async signInWithOAuth(provider: 'google' | 'apple') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) throw error
    return data
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  static async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  static async getProfile() {
    const session = await this.getSession()
    if (!session) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error) throw error
    return data
  }
}
```

**Files to create:**
- `services/auth/auth.service.ts`

### 2.3 Subscription Service (Web)

```typescript
// services/subscription/subscription.service.ts
import { supabase } from '@/lib/supabase'

export interface SubscriptionStatus {
  isPremium: boolean
  status: string
  expiresAt: Date | null
  provider: 'stripe' | 'apple' | null
}

export class SubscriptionService {
  static async getStatus(): Promise<SubscriptionStatus> {
    const session = await supabase.auth.getSession()
    if (!session.data.session) {
      return {
        isPremium: false,
        status: 'inactive',
        expiresAt: null,
        provider: null
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_expires_at, subscription_provider')
      .eq('id', session.data.session.user.id)
      .single()

    const expiresAt = profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at)
      : null

    const isPremium =
      profile?.subscription_tier === 'premium' &&
      profile?.subscription_status === 'active' &&
      expiresAt &&
      expiresAt > new Date()

    return {
      isPremium,
      status: profile?.subscription_status || 'inactive',
      expiresAt,
      provider: profile?.subscription_provider || null
    }
  }

  static async createCheckoutSession() {
    const session = await supabase.auth.getSession()
    if (!session.data.session) {
      throw new Error('Not authenticated')
    }

    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      headers: {
        Authorization: `Bearer ${session.data.session.access_token}`
      }
    })

    if (error) throw error
    return data.url
  }

  static async createCustomerPortalSession() {
    // Optional: Create Stripe customer portal session for managing subscription
    // Implementation similar to createCheckoutSession
  }
}
```

**Files to create:**
- `services/subscription/subscription.service.ts`

### 2.4 React Query Hooks

```typescript
// hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AuthService } from '@/services/auth/auth.service'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const queryClient = useQueryClient()

  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      AuthService.signIn(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })

  const signOutMutation = useMutation({
    mutationFn: () => AuthService.signOut(),
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

// hooks/useSubscription.ts
import { useQuery } from '@tanstack/react-query'
import { SubscriptionService } from '@/services/subscription/subscription.service'
import { useAuth } from './useAuth'

export function useSubscription() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: () => SubscriptionService.getStatus(),
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}
```

**Files to create:**
- `hooks/useAuth.ts`
- `hooks/useSubscription.ts`

### 2.5 Desktop Auth Callback Page

```typescript
// app/auth/desktop-callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DesktopCallbackPage() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking')

  useEffect(() => {
    async function handleDesktopAuth() {
      try {
        // Check if user is authenticated
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          // Not logged in - redirect to login
          window.location.href = '/login?return=desktop'
          return
        }

        // User is authenticated - create deep link
        const deepLink = `fluentwhisper://auth?token=${session.access_token}&refresh=${session.refresh_token}`

        setStatus('success')

        // Redirect to desktop app
        window.location.href = deepLink

      } catch (error) {
        console.error('Desktop auth error:', error)
        setStatus('error')
      }
    }

    handleDesktopAuth()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {status === 'checking' && (
          <>
            <h1 className="text-2xl font-bold mb-4">Signing you in...</h1>
            <p className="text-gray-600">Please wait while we connect to the desktop app.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold mb-4">Success!</h1>
            <p className="text-gray-600 mb-4">You're being redirected to FluentWhisper Desktop.</p>
            <p className="text-sm text-gray-500">
              If the app doesn't open automatically, please return to the desktop application.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We couldn't sign you in.</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

**Files to create:**
- `app/auth/desktop-callback/page.tsx` (Next.js App Router)
- OR `pages/auth/desktop-callback.tsx` (Next.js Pages Router)

### 2.6 UI Components

```typescript
// components/UpgradeButton.tsx
'use client'

import { useState } from 'react'
import { SubscriptionService } from '@/services/subscription/subscription.service'

export function UpgradeButton() {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const url = await SubscriptionService.createCheckoutSession()
      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Upgrade to Premium'}
    </button>
  )
}

// components/PremiumFeature.tsx
'use client'

import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeButton } from './UpgradeButton'

interface PremiumFeatureProps {
  children: React.ReactNode
  featureName?: string
}

export function PremiumFeature({ children, featureName = 'This feature' }: PremiumFeatureProps) {
  const { data: subscription, isLoading } = useSubscription()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!subscription?.isPremium) {
    return (
      <div className="border-2 border-blue-200 rounded-lg p-8 text-center bg-blue-50">
        <h3 className="text-xl font-bold mb-2">Premium Feature</h3>
        <p className="text-gray-600 mb-4">
          {featureName} is only available with Premium.
        </p>
        <UpgradeButton />
      </div>
    )
  }

  return <>{children}</>
}
```

**Files to create:**
- `components/UpgradeButton.tsx`
- `components/PremiumFeature.tsx`

---

## Phase 3: Desktop App Implementation (Tauri)

### 3.1 Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "package": {
    "productName": "FluentWhisper",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "open": true
      },
      "http": {
        "all": true,
        "request": true,
        "scope": ["https://**"]
      }
    },
    "bundle": {
      "active": true,
      "identifier": "com.fluentwhisper.app",
      "targets": "all",
      "deeplink": {
        "schemes": ["fluentwhisper"]
      }
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "title": "FluentWhisper",
        "width": 1200,
        "height": 800
      }
    ]
  }
}
```

**Files to modify:**
- `src-tauri/tauri.conf.json`

### 3.2 Rust Backend - Deep Link Handler

```rust
// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowEvent};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
struct AuthTokens {
    access_token: String,
    refresh_token: String,
}

struct AppState {
    auth_tokens: Mutex<Option<AuthTokens>>,
}

#[tauri::command]
fn start_auth_flow() -> Result<(), String> {
    // Open browser to web auth callback
    open::that("https://fluentwhisper.com/auth/desktop-callback")
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_auth_tokens(access_token: String, refresh_token: String, state: tauri::State<AppState>) -> Result<(), String> {
    let tokens = AuthTokens { access_token, refresh_token };

    // Save to app state
    let mut auth_tokens = state.auth_tokens.lock().unwrap();
    *auth_tokens = Some(tokens.clone());

    // Save to persistent storage (tauri-plugin-store)
    // TODO: Implement persistent storage

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

    // Clear from persistent storage
    // TODO: Implement persistent storage clear

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
            // Listen for deep link events
            let app_handle = app.handle();

            app.listen_global("deep-link", move |event| {
                if let Some(payload) = event.payload() {
                    // Parse: fluentwhisper://auth?token=abc123&refresh=xyz789
                    if let Some(url) = payload.strip_prefix("fluentwhisper://auth?") {
                        let params: std::collections::HashMap<String, String> = url
                            .split('&')
                            .filter_map(|param| {
                                let mut parts = param.split('=');
                                let key = parts.next()?;
                                let value = parts.next()?;
                                Some((key.to_string(), value.to_string()))
                            })
                            .collect();

                        if let (Some(token), Some(refresh)) = (params.get("token"), params.get("refresh")) {
                            // Emit auth success event to frontend
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
            open_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Dependencies to add to `Cargo.toml`:**
```toml
[dependencies]
tauri = { version = "1.5", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
open = "5.0"
```

**Files to modify:**
- `src-tauri/src/main.rs`
- `src-tauri/Cargo.toml`

### 3.3 Desktop Auth Service

```typescript
// services/auth/desktop-auth.service.ts
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'
import { supabase } from '@/lib/supabase'

export class DesktopAuthService {
  static async signIn(): Promise<void> {
    // Open browser for web login
    await invoke('start_auth_flow')

    // Wait for deep link callback
    return new Promise((resolve, reject) => {
      const unlisten = listen('auth-success', async (event: any) => {
        try {
          const { access_token, refresh_token } = event.payload

          // Save tokens in Rust backend
          await invoke('save_auth_tokens', {
            accessToken: access_token,
            refreshToken: refresh_token
          })

          // Set session in Supabase client
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
    // Try to get session from Supabase
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      return session
    }

    // Try to restore from stored tokens
    try {
      const tokens: any = await invoke('get_auth_tokens')

      if (tokens) {
        const { data, error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token
        })

        if (error) throw error
        return data.session
      }
    } catch (error) {
      console.error('Failed to restore session:', error)
    }

    return null
  }

  static async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession()

    if (error) throw error

    if (data.session) {
      // Update stored tokens
      await invoke('save_auth_tokens', {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      })
    }

    return data.session
  }
}
```

**Files to create:**
- `services/auth/desktop-auth.service.ts`

### 3.4 Desktop Subscription Service

```typescript
// services/subscription/desktop-subscription.service.ts
import { invoke } from '@tauri-apps/api/tauri'
import { supabase } from '@/lib/supabase'

export interface SubscriptionStatus {
  isPremium: boolean
  status: string
  expiresAt: Date | null
  provider: 'stripe' | 'apple' | null
}

const CACHE_KEY = 'subscription_status'
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7 // 7 days offline grace period

export class DesktopSubscriptionService {
  static async getStatus(): Promise<SubscriptionStatus> {
    try {
      // Try online check first
      const session = await supabase.auth.getSession()

      if (!session.data.session) {
        throw new Error('Not authenticated')
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, subscription_expires_at, subscription_provider')
        .eq('id', session.data.session.user.id)
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

      // Cache the result
      await this.cacheStatus(status)

      return status
    } catch (error) {
      console.error('Online subscription check failed, using cache:', error)

      // Use cached status
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

    // If cache is too old, don't allow premium features
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
    const url = 'https://fluentwhisper.com/upgrade'
    await invoke('open_url', { url })
  }

  static async openManageSubscription(): Promise<void> {
    const url = 'https://fluentwhisper.com/account/subscription'
    await invoke('open_url', { url })
  }
}
```

**Files to create:**
- `services/subscription/desktop-subscription.service.ts`

### 3.5 Desktop React Hooks

```typescript
// hooks/useAuth.ts (Desktop version)
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DesktopAuthService } from '@/services/auth/desktop-auth.service'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    // Try to restore session on mount
    DesktopAuthService.getSession().then(session => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes
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

// hooks/useSubscription.ts (Desktop version)
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
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 1 // Only retry once (use cache on failure)
  })
}
```

**Files to create:**
- `hooks/useAuth.ts`
- `hooks/useSubscription.ts`

### 3.6 Desktop UI Components

```typescript
// components/LoginScreen.tsx (Desktop)
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function LoginScreen() {
  const { signIn, isSigningIn } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    setError(null)
    try {
      await signIn()
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Welcome to FluentWhisper</h1>
        <p className="text-gray-600 text-center mb-8">
          Sign in to sync your progress across devices
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningIn ? 'Opening browser...' : 'Sign In with Browser'}
        </button>

        <p className="mt-4 text-sm text-gray-500 text-center">
          This will open your web browser to sign in securely.
        </p>
      </div>
    </div>
  )
}

// components/UpgradeButton.tsx (Desktop)
import { DesktopSubscriptionService } from '@/services/subscription/desktop-subscription.service'
import { ExternalLink } from 'lucide-react'

export function UpgradeButton() {
  const handleUpgrade = async () => {
    await DesktopSubscriptionService.openUpgradePage()
  }

  return (
    <button
      onClick={handleUpgrade}
      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
    >
      Upgrade on Web
      <ExternalLink size={16} />
    </button>
  )
}

// components/PremiumFeature.tsx (Desktop)
import { useSubscription } from '@/hooks/useSubscription'
import { UpgradeButton } from './UpgradeButton'
import { DesktopSubscriptionService } from '@/services/subscription/desktop-subscription.service'

interface PremiumFeatureProps {
  children: React.ReactNode
  featureName?: string
}

export function PremiumFeature({ children, featureName = 'This feature' }: PremiumFeatureProps) {
  const { data: subscription, isLoading, refetch } = useSubscription()

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!subscription?.isPremium) {
    return (
      <div className="border-2 border-blue-200 rounded-lg p-8 text-center bg-blue-50">
        <div className="max-w-md mx-auto">
          <h3 className="text-xl font-bold mb-2">Premium Feature</h3>
          <p className="text-gray-600 mb-4">
            {featureName} is only available with Premium.
          </p>
          <div className="space-y-3">
            <UpgradeButton />
            <button
              onClick={() => refetch()}
              className="block w-full text-sm text-blue-600 hover:text-blue-700"
            >
              I just upgraded, check again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
```

**Files to create:**
- `components/LoginScreen.tsx`
- `components/UpgradeButton.tsx`
- `components/PremiumFeature.tsx`

---

## Phase 4: iOS App Implementation

### 4.1 RevenueCat Setup

1. Create RevenueCat account at https://app.revenuecat.com
2. Create new app in RevenueCat dashboard
3. Connect to App Store Connect
4. Configure products:
   - Create "premium" entitlement
   - Add "premium_monthly" product (link to App Store product ID)
   - Add "premium_annual" product (optional)
5. Set up webhook: Point to your Supabase function URL
   - `https://your-project.supabase.co/functions/v1/revenuecat-webhook`

### 4.2 iOS Dependencies

```swift
// Add to Package.swift or use CocoaPods
dependencies: [
    .package(url: "https://github.com/RevenueCat/purchases-ios.git", from: "4.0.0")
]
```

### 4.3 iOS Subscription Manager

```swift
// Services/SubscriptionManager.swift
import RevenueCat
import Foundation

class SubscriptionManager: ObservableObject {
    static let shared = SubscriptionManager()

    @Published var isPremium: Bool = false
    @Published var isLoading: Bool = true

    private init() {}

    func configure(userId: String) {
        Purchases.logLevel = .debug
        Purchases.configure(withAPIKey: "rc_ios_api_key", appUserID: userId)

        // Listen for purchase updates
        Purchases.shared.delegate = self

        // Check initial status
        Task {
            await checkSubscriptionStatus()
        }
    }

    func checkSubscriptionStatus() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let customerInfo = try await Purchases.shared.customerInfo()
            await MainActor.run {
                self.isPremium = customerInfo.entitlements["premium"]?.isActive == true
            }
        } catch {
            print("Failed to fetch customer info: \(error)")
        }
    }

    func getOfferings() async throws -> Offerings {
        return try await Purchases.shared.offerings()
    }

    func purchase(package: Package) async throws {
        let result = try await Purchases.shared.purchase(package: package)
        await MainActor.run {
            self.isPremium = result.customerInfo.entitlements["premium"]?.isActive == true
        }
    }

    func restorePurchases() async throws {
        let customerInfo = try await Purchases.shared.restorePurchases()
        await MainActor.run {
            self.isPremium = customerInfo.entitlements["premium"]?.isActive == true
        }
    }
}

extension SubscriptionManager: PurchasesDelegate {
    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        Task { @MainActor in
            self.isPremium = customerInfo.entitlements["premium"]?.isActive == true
        }
    }
}
```

### 4.4 iOS Paywall View

```swift
// Views/PaywallView.swift
import SwiftUI
import RevenueCat

struct PaywallView: View {
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    @State private var offerings: Offerings?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 20) {
            Text("Upgrade to Premium")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Unlock unlimited transcription and advanced features")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            if let packages = offerings?.current?.availablePackages {
                ForEach(packages, id: \.identifier) { package in
                    PackageButton(package: package) {
                        await purchasePackage(package)
                    }
                }
            }

            if let errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
            }

            Button("Restore Purchases") {
                Task { await restorePurchases() }
            }
            .font(.caption)
        }
        .padding()
        .task {
            await loadOfferings()
        }
    }

    private func loadOfferings() async {
        do {
            offerings = try await subscriptionManager.getOfferings()
        } catch {
            errorMessage = "Failed to load offers"
        }
    }

    private func purchasePackage(_ package: Package) async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await subscriptionManager.purchase(package: package)
        } catch {
            errorMessage = "Purchase failed: \(error.localizedDescription)"
        }
    }

    private func restorePurchases() async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await subscriptionManager.restorePurchases()
        } catch {
            errorMessage = "Restore failed: \(error.localizedDescription)"
        }
    }
}

struct PackageButton: View {
    let package: Package
    let action: () async -> Void

    var body: some View {
        Button {
            Task { await action() }
        } label: {
            VStack {
                Text(package.storeProduct.localizedTitle)
                    .font(.headline)
                Text(package.localizedPriceString)
                    .font(.title2)
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
    }
}
```

**Files to create:**
- `Services/SubscriptionManager.swift`
- `Views/PaywallView.swift`

---

## Phase 5: Testing & Deployment

### 5.1 Testing Checklist

**Backend:**
- [ ] Supabase database migrations applied
- [ ] Edge Functions deployed and accessible
- [ ] Stripe webhook configured and receiving events
- [ ] RevenueCat webhook configured and receiving events
- [ ] RLS policies working correctly

**Web:**
- [ ] User can sign up/sign in
- [ ] Stripe checkout flow works
- [ ] Subscription status updates after purchase
- [ ] Desktop callback page redirects correctly
- [ ] Premium features gated correctly

**Desktop:**
- [ ] Deep link registered (test with `open fluentwhisper://auth?token=test`)
- [ ] Browser opens for sign-in
- [ ] Deep link callback receives tokens
- [ ] Tokens stored securely
- [ ] Session persists after app restart
- [ ] Subscription status checks work online
- [ ] Offline cache works (disconnect internet, check status)
- [ ] Upgrade button opens web browser
- [ ] Premium features gated correctly

**iOS:**
- [ ] RevenueCat configured with correct API key
- [ ] Products load from App Store
- [ ] Purchase flow completes
- [ ] Subscription syncs to backend
- [ ] Premium features unlock after purchase
- [ ] Restore purchases works

### 5.2 Environment Variables

**Web (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

**Supabase Secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set STRIPE_PRICE_ID=price_xxx
supabase secrets set WEB_URL=https://fluentwhisper.com
```

**Desktop (.env):**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

**iOS (Config.xcconfig):**
```
REVENUECAT_API_KEY=rc_ios_xxx
```

### 5.3 Deployment Steps

1. **Deploy Supabase:**
   ```bash
   supabase db push
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-webhook
   supabase functions deploy revenuecat-webhook
   ```

2. **Configure Stripe:**
   - Add webhook endpoint: `https://xxx.supabase.co/functions/v1/stripe-webhook`
   - Select events: `customer.subscription.*`, `invoice.payment_failed`

3. **Configure RevenueCat:**
   - Add webhook URL: `https://xxx.supabase.co/functions/v1/revenuecat-webhook`
   - Enable all subscription events

4. **Deploy Web App:**
   ```bash
   bun run build
   # Deploy to Vercel/Netlify/etc
   ```

5. **Build Desktop App:**
   ```bash
   cd src-tauri
   cargo build --release
   ```

6. **Build iOS App:**
   - Open in Xcode
   - Configure signing
   - Submit to App Store

---

## Phase 6: Premium Feature Implementation

### 6.1 Free vs Premium Tiers

**Free Tier:**
- 30 minutes of transcription per month
- Basic stats (WPM, accuracy)
- 7 days of audio storage
- Standard language models

**Premium Tier:**
- Unlimited transcription
- Advanced analytics and insights
- Permanent audio storage
- Premium language models
- Export to multiple formats
- Priority support

### 6.2 Usage Tracking

```typescript
// services/usage/usage.service.ts
import { supabase } from '@/lib/supabase'

export class UsageService {
  static async trackTranscription(userId: string, durationMinutes: number) {
    const { data, error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        action: 'transcription',
        duration_minutes: durationMinutes,
        timestamp: new Date().toISOString()
      })

    if (error) throw error
    return data
  }

  static async getMonthlyUsage(userId: string): Promise<number> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('usage_logs')
      .select('duration_minutes')
      .eq('user_id', userId)
      .eq('action', 'transcription')
      .gte('timestamp', startOfMonth.toISOString())

    if (error) throw error

    return data.reduce((sum, log) => sum + log.duration_minutes, 0)
  }

  static async canTranscribe(userId: string, subscription: SubscriptionStatus): Promise<boolean> {
    if (subscription.isPremium) {
      return true // Unlimited for premium
    }

    const usage = await this.getMonthlyUsage(userId)
    return usage < 30 // 30 minutes free tier limit
  }
}
```

### 6.3 Feature Gate in Transcription Service

```typescript
// services/transcription/transcription.service.ts
import { UsageService } from '../usage/usage.service'
import { SubscriptionService } from '../subscription/subscription.service'

export class TranscriptionService {
  static async startTranscription(audioBlob: Blob, userId: string) {
    // Check subscription and usage
    const subscription = await SubscriptionService.getStatus()
    const canTranscribe = await UsageService.canTranscribe(userId, subscription)

    if (!canTranscribe) {
      throw new Error('Monthly transcription limit reached. Upgrade to Premium for unlimited transcription.')
    }

    // Proceed with transcription
    const result = await this.transcribeAudio(audioBlob)

    // Track usage
    const durationMinutes = result.duration / 60
    await UsageService.trackTranscription(userId, durationMinutes)

    return result
  }

  private static async transcribeAudio(audioBlob: Blob) {
    // Your existing transcription logic
  }
}
```

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1: Backend** | Supabase setup, tables, Edge Functions | 2-3 days |
| **Phase 2: Web** | Auth, subscription service, UI | 2 days |
| **Phase 3: Desktop** | Rust handlers, deep links, services | 2-3 days |
| **Phase 4: iOS** | RevenueCat integration, paywall | 1-2 days |
| **Phase 5: Testing** | End-to-end testing all platforms | 2 days |
| **Phase 6: Features** | Usage tracking, feature gates | 1 day |
| **Total** | | **10-13 days** |

---

## Success Criteria

- [ ] Users can sign in on web and automatically sign in on desktop
- [ ] Users can purchase subscriptions on web (Stripe)
- [ ] Users can purchase subscriptions on iOS (RevenueCat)
- [ ] Desktop correctly shows subscription status (read-only)
- [ ] Premium features are properly gated on all platforms
- [ ] Offline desktop app respects 7-day grace period
- [ ] Webhooks correctly update subscription status
- [ ] All auth tokens stored securely

---

## Future Enhancements

1. **Android support** - Add Google Play billing via RevenueCat
2. **Referral program** - Give free premium time for referrals
3. **Team plans** - Multi-user subscriptions
4. **Lifetime licenses** - One-time purchase option
5. **Free trials** - 7-day trial for new users
6. **Promo codes** - Discount codes for special offers

---

## Support & Documentation

- Supabase docs: https://supabase.com/docs
- Stripe docs: https://stripe.com/docs
- RevenueCat docs: https://docs.revenuecat.com
- Tauri deep links: https://tauri.app/v1/guides/features/deep-linking
- React Query: https://tanstack.com/query/latest

---

## Notes

- All auth tokens are stored securely (Rust backend, never in localStorage)
- Desktop never handles payments (reduces security surface area)
- 7-day offline grace period prevents locking out users with connectivity issues
- Subscription status cached locally to work offline
- Deep link auth provides seamless desktop ↔ web experience
- RevenueCat handles all Apple IAP complexity
- Stripe provides excellent web payment experience
- Single source of truth: Supabase `profiles` table
