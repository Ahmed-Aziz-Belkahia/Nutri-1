# Google OAuth Configuration Fix

## Problem
Error 403: disallowed_useragent occurs when Google OAuth is accessed from certain contexts.

## Solution: Configure Google Cloud Console Properly

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or create one if you haven't)

### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required information:
   - App name: **Nutri AI**
   - User support email: Your email
   - Developer contact email: Your email
4. **Add Authorized domains**:
   - `nutriai.online`
   - `app.nutriai.online`
5. Click **Save and Continue**

### Step 3: Configure OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID (or create one)
3. **Add Authorized JavaScript origins**:
   ```
   https://app.nutriai.online
   http://localhost:5000
   http://localhost:3000
   http://localhost:5173
   ```

4. **Add Authorized redirect URIs**:
   ```
   https://app.nutriai.online/api/auth/google/callback
   http://localhost:5000/api/auth/google/callback
   ```

5. Click **Save**

### Step 4: Update .env File
Make sure your .env has the correct values:

```properties
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=https://app.nutriai.online/api/auth/google/callback
```

For local development:
```properties
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Step 5: Additional Settings for Mobile/PWA

#### Option A: Use Standard Web Flow (Recommended)
The app is now configured to use standard OAuth flow that works on:
- ✅ Desktop browsers
- ✅ Mobile browsers (Safari, Chrome)
- ✅ PWA (Progressive Web App)
- ✅ Installed web apps

#### Option B: If Still Having Issues

If you're testing from a WebView or embedded browser:

1. **Test in actual mobile browser**:
   - Open Safari or Chrome directly
   - Visit: https://app.nutriai.online
   - Click "Sign in with Google"
   - Should work normally

2. **For iOS Safari**:
   - Ensure you're not in "Private" mode
   - Allow cookies and pop-ups

3. **For Android Chrome**:
   - Ensure you're not in "Incognito" mode
   - Allow cookies and pop-ups

### Common Issues & Solutions

#### Issue: "disallowed_useragent"
- **Cause**: Trying to use OAuth from embedded WebView
- **Solution**: Use the app in Safari/Chrome browser directly

#### Issue: "redirect_uri_mismatch"
- **Cause**: Callback URL not matching Google Console settings
- **Solution**: Add ALL possible callback URLs to Google Console

#### Issue: "invalid_client"
- **Cause**: Wrong CLIENT_ID or CLIENT_SECRET
- **Solution**: Copy correct values from Google Console to .env

### Testing Checklist

- [ ] Google Cloud Console configured with correct domains
- [ ] Authorized redirect URIs added
- [ ] .env file updated with correct credentials
- [ ] App deployed with latest changes
- [ ] Testing in actual mobile browser (not WebView)
- [ ] Cookies enabled in browser
- [ ] Not in Private/Incognito mode

### Current Configuration

**Your Domain**: app.nutriai.online
**Callback URL**: https://app.nutriai.online/api/auth/google/callback

Make sure these match EXACTLY in Google Cloud Console!

---

## After Configuration

Once configured correctly, Google OAuth will work seamlessly:
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth page
3. User signs in with Google account
4. Google redirects back to your app
5. User is authenticated ✅

No special handling needed - it works like any other web app!
