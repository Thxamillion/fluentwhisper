# Desktop Authentication Setup Guide

This guide explains how to set up OAuth authentication for your Fluent Diary desktop app.

## 🎯 Overview

The desktop app uses a web-based OAuth flow:
1. User clicks "Sign In" → Opens browser to Google OAuth
2. User authenticates → Supabase redirects to `https://fluentdiary.com/desktop-auth-callback`
3. Callback page extracts tokens → Redirects to `fluentwhisper://auth-callback?tokens=...`
4. Desktop app receives deep link → Saves credentials and signs in user

---

## ✅ Step 1: Deploy Callback Page to fluentdiary.com

You need to add the callback page to your website at **`https://fluentdiary.com/desktop-auth-callback`**

### Option A: Static HTML (Simplest)
If your site supports static pages, upload `desktop-auth-callback.html`:

```bash
# Copy the file to your website's public directory
# Example for Next.js:
cp desktop-auth-callback.html path/to/nextjs-app/public/desktop-auth-callback.html

# The page will be accessible at:
# https://fluentdiary.com/desktop-auth-callback.html
```

### Option B: Next.js Page
If using Next.js, create a new page:

**File: `pages/desktop-auth-callback.tsx` (or `app/desktop-auth-callback/page.tsx` for App Router)**

```typescript
export default function DesktopAuthCallback() {
  return (
    <html>
      <head>
        <title>Fluent Diary - Authentication</title>
        {/* Copy the styles and script from desktop-auth-callback.html */}
      </head>
      <body>
        {/* Copy the body content from desktop-auth-callback.html */}
      </body>
    </html>
  );
}
```

### Option C: Custom Implementation
You can implement this in any framework. The page just needs to:
1. Parse `access_token` and `refresh_token` from URL hash: `#access_token=xxx&refresh_token=yyy`
2. Redirect to: `fluentwhisper://auth-callback?access_token=xxx&refresh_token=yyy`

---

## ✅ Step 2: Configure Supabase Redirect URLs

In your Supabase project dashboard:

1. Go to **Authentication → URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://fluentdiary.com/desktop-auth-callback
   ```
   (Note: If you used `.html` extension, use that URL instead)

3. **Important:** Also ensure your Site URL is set correctly

---

## ✅ Step 3: Configure OAuth Provider (Google)

1. In Supabase dashboard: **Authentication → Providers**
2. Enable **Google** provider
3. Add OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Add authorized redirect URI in Google Cloud Console:
   ```
   https://xtflvvyitebirnsafvrm.supabase.co/auth/v1/callback
   ```

---

## ✅ Step 4: Test the Flow

### Testing Steps:
1. Build and run the desktop app:
   ```bash
   npm run tauri:dev
   ```

2. Go through onboarding → Click "Sign In"

3. Browser should open to Google OAuth

4. After signing in, should redirect to your callback page

5. Callback page should redirect to `fluentwhisper://...`

6. Desktop app should:
   - Show green success message "Successfully signed in!"
   - Premium models unlock (if user is premium)
   - Cloud model auto-selects (if premium)

### Debugging:
- Check browser console on callback page for errors
- Check desktop app terminal for "Received deep link" message
- Check desktop app console for auth event logs

---

## 🔍 Troubleshooting

### Issue: "Redirect URL not allowed"
**Solution:** Add the callback URL to Supabase redirect URLs (Step 2)

### Issue: Desktop app doesn't open after auth
**Possible causes:**
1. Deep link not registered (restart after first install)
2. Browser blocking custom URL schemes
3. Callback page not redirecting properly (check browser console)

### Issue: "No credentials found" error
**Solution:** Sign in flow didn't complete. Check:
- Callback page URL is correct in Supabase
- Desktop app received the deep link (check terminal logs)
- Tokens were saved to keychain (check Rust logs)

### Issue: Premium features don't unlock
**Check:**
1. User has active subscription in Supabase database
2. `user_subscriptions` table has correct data
3. Subscription query is running (check network tab)
4. Wait 1-2 seconds for subscription to load after auth

---

## 📝 Code Changes Made

### Desktop App:
- ✅ `auth.rs:9` - Updated callback URL to `https://fluentdiary.com/desktop-auth-callback`
- ✅ `Onboarding.tsx:25` - Added auth success state tracking
- ✅ `Onboarding.tsx:35-48` - Added auth listener to detect sign-in
- ✅ `ModelSelectionStep.tsx:28-42` - Added success message banner
- ✅ `ModelSelectionStep.tsx:98,135` - Added smooth transitions for premium unlock

### Website:
- 📄 `desktop-auth-callback.html` - Template callback page

---

## 🚀 Next Steps After Setup

1. Test auth flow end-to-end
2. Test with premium and free users
3. Test on both macOS and Windows (if applicable)
4. Update app documentation with sign-in instructions
5. Monitor auth errors in production

---

## 🔒 Security Notes

- Tokens are stored in system keychain (secure)
- Callback page only redirects, doesn't store tokens
- Deep link handler validates token format
- Auth errors are logged but tokens are never logged
- Tokens expire and refresh automatically via Supabase

---

## 📚 Related Files

- `src-tauri/src/commands/auth.rs` - Auth commands
- `src-tauri/src/main.rs` - Deep link handler
- `src/services/auth/desktop-auth.service.ts` - Auth service
- `src/pages/onboarding/Onboarding.tsx` - Onboarding flow
- `src/pages/onboarding/ModelSelectionStep.tsx` - Model selection with auth
- `desktop-auth-callback.html` - Callback page template

---

## ✨ Features Implemented

- ✅ Browser-based OAuth with Google
- ✅ Deep link redirect back to app
- ✅ Success message when auth completes
- ✅ Visual feedback when premium unlocks
- ✅ Auto-select cloud model for premium users
- ✅ Smooth opacity transitions for premium features
- ✅ Error handling throughout flow
- ✅ Secure token storage in system keychain

---

**Need help?** Check the troubleshooting section or console logs for detailed error messages.
