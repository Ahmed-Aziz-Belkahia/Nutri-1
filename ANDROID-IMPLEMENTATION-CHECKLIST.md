# Android WebView OAuth - Quick Implementation Checklist

## ✅ Backend Changes (COMPLETED)
- [x] Updated `/api/auth/google` endpoint to return OAuth URL as JSON when `platform=mobile&return_url=true`
- [x] Enhanced `GoogleAuthButton.tsx` to detect WebView and handle OAuth appropriately
- [x] Created utility functions for WebView detection
- [x] All changes deployed to VPS (72.61.182.248:5000)

## 🔧 Android App Changes Required

### 1. Add Chrome Custom Tabs Dependency

**File:** `build.gradle` (Module: app)

```gradle
dependencies {
    implementation 'androidx.browser:browser:1.7.0'
    // ... existing dependencies
}
```

### 2. Update AndroidManifest.xml

**File:** `app/src/main/AndroidManifest.xml`

Add deep link intent-filter inside your main `<activity>`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    
    <data
        android:scheme="nutriai"
        android:host="auth" />
</intent-filter>
```

### 3. Update MainActivity

Choose **Option A** (simpler) or **Option B** (more control):

#### Option A: URL Interception (Recommended - No JS Bridge Needed)

Your `MainActivity.java` or `MainActivity.kt` should intercept OAuth URLs in `shouldOverrideUrlLoading`:

```java
// In WebViewClient
@Override
public boolean shouldOverrideUrlLoading(WebView view, String url) {
    // Intercept OAuth URLs and open in Chrome Custom Tabs
    if (url.contains("/api/auth/google")) {
        openInCustomTabs(url);
        return true;
    }
    return false;
}

private void openInCustomTabs(String url) {
    CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
    CustomTabsIntent customTabsIntent = builder.build();
    customTabsIntent.launchUrl(this, Uri.parse(url));
}
```

#### Option B: JavaScript Bridge (More Control)

Add JS interface to your WebView:

```java
webView.addJavascriptInterface(new WebAppInterface(this), "Android");

public class WebAppInterface {
    Context context;
    
    @JavascriptInterface
    public void openOAuthInBrowser(String url) {
        ((MainActivity) context).openInCustomTabs(url);
    }
}
```

### 4. Handle Deep Link Callback

Add to your `MainActivity`:

```java
@Override
protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    handleDeepLink(intent);
}

private void handleDeepLink(Intent intent) {
    Uri data = intent.getData();
    if (data != null && "nutriai".equals(data.getScheme())) {
        if ("/auth/success".equals(data.getPath())) {
            String accessToken = data.getQueryParameter("access");
            String refreshToken = data.getQueryParameter("refresh");
            
            // Set cookies in WebView
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setCookie(BASE_URL, "accessToken=" + accessToken);
            cookieManager.setCookie(BASE_URL, "refreshToken=" + refreshToken);
            cookieManager.flush();
            
            // Navigate to dashboard
            webView.loadUrl(BASE_URL + "/dashboard");
        }
    }
}
```

### 5. Update Google Cloud Console

Add these redirect URIs to your OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Click your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   - `http://72.61.182.248:5000/api/auth/google/callback`
   - `https://YOUR_DOMAIN/api/auth/google/callback` (if you have a domain)
   - `nutriai://auth/callback` (deep link)

## 🧪 Testing Steps

### 1. Test Deep Link
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "nutriai://auth/success?access=test&refresh=test&onboarding=false" \
  com.nutriai.app
```

### 2. Test OAuth Flow
1. Install app on device/emulator
2. Open app
3. Click "Sign in with Google"
4. Should open Chrome Custom Tabs (not WebView)
5. Complete Google sign-in
6. Should redirect back to app
7. Check if logged in

### 3. Check Logs
```bash
adb logcat | grep -i "oauth\|auth\|google"
```

## 📱 User Flow

1. User opens app (WebView loads your web app)
2. User clicks "Sign in with Google" button
3. **Frontend detects WebView** → calls backend with `return_url=true`
4. **Backend returns OAuth URL** as JSON
5. **WebView intercepts** URL or **JS bridge** calls Android method
6. **Android opens Chrome Custom Tabs** with OAuth URL
7. User signs in with Google
8. **Google redirects** to backend callback
9. **Backend redirects** to `nutriai://auth/success?access=JWT&refresh=JWT`
10. **Android handles deep link** → sets cookies → navigates to dashboard
11. ✅ User is logged in!

## ⚠️ Common Issues & Solutions

### Issue: Chrome Custom Tabs not opening
**Solution:** Add dependency `androidx.browser:browser:1.7.0` and sync Gradle

### Issue: Deep link not working
**Check:**
- `android:scheme="nutriai"` in AndroidManifest.xml
- Deep link added to Google Cloud Console
- Test with `adb shell am start` command

### Issue: Cookies not persisting
**Solution:**
```java
CookieManager cookieManager = CookieManager.getInstance();
cookieManager.setAcceptCookie(true);
cookieManager.setAcceptThirdPartyCookies(webView, true);
cookieManager.flush(); // Important!
```

### Issue: Still getting Error 403
**Causes:**
- Using WebView instead of Chrome Custom Tabs
- Not intercepting OAuth URLs correctly
- Check if `shouldOverrideUrlLoading` returns `true`

## 📚 Full Documentation

- **Detailed Android Code:** See `ANDROID-WEBVIEW-OAUTH-FIX.md`
- **Backend Implementation:** See `MOBILE-OAUTH-FIX.md`

## 🎯 Next Steps

1. Update Android app with changes above
2. Test OAuth flow on physical device
3. Submit updated APK to Google Play Store
4. Update production URLs when deployed

## 🚀 Production Readiness

Before submitting to Play Store:

- [ ] Test OAuth on physical Android device
- [ ] Test deep link handling
- [ ] Verify cookies persist after app restart
- [ ] Test with different Android versions
- [ ] Update `BASE_URL` to production domain
- [ ] Add production callback URLs to Google Cloud Console
- [ ] Test error scenarios (no internet, OAuth cancelled)
- [ ] Add proper error messages to users

## 📞 Support

If you encounter issues:
1. Check `adb logcat` for errors
2. Verify Chrome Custom Tabs is opening (not WebView)
3. Test deep link with `adb shell am start` command
4. Ensure backend is returning OAuth URL correctly

**Backend Status:** ✅ Ready and deployed
**Frontend Status:** ✅ WebView detection implemented
**Android App Status:** ⏳ Awaiting your implementation

---

**Key Point:** The backend and frontend are ready! You just need to update your Android app in Android Studio to intercept OAuth URLs and open them in Chrome Custom Tabs instead of WebView. The complete code examples are in `ANDROID-WEBVIEW-OAUTH-FIX.md`.
