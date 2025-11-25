# Android WebView OAuth Fix for Google Play Store

## Problem
Your Android app uses a WebView to display the web application. Google blocks OAuth in WebViews with **Error 403: disallowed_useragent**.

## Solution for WebView-Based Apps

### Option 1: Intercept OAuth URLs and Open in Chrome Custom Tabs (RECOMMENDED)

This keeps your WebView app but opens OAuth in a secure browser.

#### Step 1: Update AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.nutriai.app">

    <uses-permission android:name="android.permission.INTERNET" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.NutriAI">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
            <!-- Deep link to handle OAuth callback -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                
                <data
                    android:scheme="nutriai"
                    android:host="auth" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

#### Step 2: Update build.gradle (Module: app)

```gradle
dependencies {
    implementation 'androidx.browser:browser:1.7.0'
    // ... other dependencies
}
```

#### Step 3: Update MainActivity (Java)

```java
package com.nutriai.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.CookieManager;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private static final String BASE_URL = "http://72.61.182.248:5000"; // Your VPS

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        setupWebView();

        // Check if launched from deep link (OAuth callback)
        handleDeepLink(getIntent());

        // Load the app
        webView.loadUrl(BASE_URL);
    }

    private void setupWebView() {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        
        // Enable cookies
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Intercept Google OAuth URLs
                if (url.contains("accounts.google.com/o/oauth2")) {
                    openInCustomTabs(url);
                    return true;
                }
                
                // Intercept the OAuth initiation endpoint
                if (url.contains("/api/auth/google")) {
                    // Append platform parameter
                    String oauthUrl = url + (url.contains("?") ? "&" : "?") + "platform=mobile&return_url=true";
                    fetchOAuthUrlAndOpen(oauthUrl);
                    return true;
                }
                
                return false;
            }
        });
    }

    private void fetchOAuthUrlAndOpen(String apiUrl) {
        new Thread(() -> {
            try {
                // Fetch the OAuth URL from backend
                java.net.URL url = new java.net.URL(apiUrl);
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                
                java.io.BufferedReader reader = new java.io.BufferedReader(
                    new java.io.InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                // Parse JSON response (use org.json or Gson in production)
                String jsonResponse = response.toString();
                String authUrl = extractAuthUrl(jsonResponse);
                
                if (authUrl != null) {
                    runOnUiThread(() -> openInCustomTabs(authUrl));
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private String extractAuthUrl(String json) {
        // Simple JSON parsing (use proper JSON library in production)
        try {
            int start = json.indexOf("\"authUrl\":\"") + 11;
            int end = json.indexOf("\"", start);
            return json.substring(start, end)
                .replace("\\u0026", "&")
                .replace("\\/", "/");
        } catch (Exception e) {
            return null;
        }
    }

    private void openInCustomTabs(String url) {
        CustomTabsIntent.Builder builder = new CustomTabsIntent.Builder();
        builder.setShowTitle(true);
        builder.setStartAnimations(this, android.R.anim.fade_in, android.R.anim.fade_out);
        builder.setExitAnimations(this, android.R.anim.fade_in, android.R.anim.fade_out);
        
        CustomTabsIntent customTabsIntent = builder.build();
        customTabsIntent.launchUrl(this, Uri.parse(url));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        Uri data = intent.getData();
        if (data != null && "nutriai".equals(data.getScheme())) {
            String path = data.getPath();
            
            if ("/auth/success".equals(path)) {
                // OAuth callback successful
                String accessToken = data.getQueryParameter("access");
                String refreshToken = data.getQueryParameter("refresh");
                boolean needsOnboarding = "true".equals(data.getQueryParameter("onboarding"));
                
                // Inject tokens into WebView cookies
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setCookie(BASE_URL, "accessToken=" + accessToken + "; path=/; max-age=" + (15 * 60));
                cookieManager.setCookie(BASE_URL, "refreshToken=" + refreshToken + "; path=/; max-age=" + (7 * 24 * 60 * 60));
                cookieManager.flush();
                
                // Navigate to appropriate page
                String targetUrl = needsOnboarding ? BASE_URL + "/onboarding" : BASE_URL + "/dashboard";
                webView.loadUrl(targetUrl);
            } else if ("/auth/error".equals(path)) {
                // OAuth failed
                webView.loadUrl(BASE_URL + "/login?error=oauth_failed");
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
```

#### Step 4: Update MainActivity (Kotlin - Alternative)

```kotlin
package com.nutriai.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    
    companion object {
        private const val BASE_URL = "http://72.61.182.248:5000"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        setupWebView()

        // Handle deep link
        handleDeepLink(intent)

        // Load app
        webView.loadUrl(BASE_URL)
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                url?.let {
                    // Intercept Google OAuth URLs
                    if (it.contains("accounts.google.com/o/oauth2")) {
                        openInCustomTabs(it)
                        return true
                    }

                    // Intercept OAuth initiation
                    if (it.contains("/api/auth/google")) {
                        val oauthUrl = it + (if (it.contains("?")) "&" else "?") + "platform=mobile&return_url=true"
                        fetchOAuthUrlAndOpen(oauthUrl)
                        return true
                    }
                }
                return false
            }
        }
    }

    private fun fetchOAuthUrlAndOpen(apiUrl: String) {
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val url = URL(apiUrl)
                val response = url.readText()
                val json = JSONObject(response)
                val authUrl = json.getString("authUrl")

                withContext(Dispatchers.Main) {
                    openInCustomTabs(authUrl)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun openInCustomTabs(url: String) {
        val builder = CustomTabsIntent.Builder()
        builder.setShowTitle(true)
        
        val customTabsIntent = builder.build()
        customTabsIntent.launchUrl(this, Uri.parse(url))
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { handleDeepLink(it) }
    }

    private fun handleDeepLink(intent: Intent) {
        intent.data?.let { uri ->
            if (uri.scheme == "nutriai" && uri.path == "/auth/success") {
                val accessToken = uri.getQueryParameter("access")
                val refreshToken = uri.getQueryParameter("refresh")
                val needsOnboarding = uri.getQueryParameter("onboarding") == "true"

                // Set cookies
                val cookieManager = CookieManager.getInstance()
                cookieManager.setCookie(BASE_URL, "accessToken=$accessToken; path=/; max-age=${15 * 60}")
                cookieManager.setCookie(BASE_URL, "refreshToken=$refreshToken; path=/; max-age=${7 * 24 * 60 * 60}")
                cookieManager.flush()

                // Navigate
                val targetUrl = if (needsOnboarding) "$BASE_URL/onboarding" else "$BASE_URL/dashboard"
                webView.loadUrl(targetUrl)
            }
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
```

### Option 2: JavaScript Bridge (Alternative)

If you want more control from the web app, use a JavaScript bridge:

#### MainActivity with JS Bridge

```java
webView.addJavascriptInterface(new WebAppInterface(this), "Android");

public class WebAppInterface {
    Context context;

    WebAppInterface(Context c) {
        context = c;
    }

    @JavascriptInterface
    public void openOAuthInBrowser(String url) {
        ((MainActivity) context).openInCustomTabs(url);
    }
}
```

#### Web App JavaScript

```javascript
// In your web app login page
function initiateGoogleSignIn() {
    // Check if running in Android WebView
    if (window.Android) {
        // Fetch OAuth URL from backend
        fetch('/api/auth/google?platform=mobile&return_url=true')
            .then(res => res.json())
            .then(data => {
                // Open in Chrome Custom Tabs via Android bridge
                window.Android.openOAuthInBrowser(data.authUrl);
            });
    } else {
        // Normal web flow
        window.location.href = '/api/auth/google';
    }
}
```

## Testing

### 1. Test Deep Link
```bash
adb shell am start -W -a android.intent.action.VIEW -d "nutriai://auth/success?access=test&refresh=test&onboarding=false" com.nutriai.app
```

### 2. Test OAuth Flow
1. Open app
2. Click "Sign in with Google"
3. Should open Chrome Custom Tabs
4. Complete OAuth
5. Should redirect back to app with tokens

### 3. Verify Cookies
Check if cookies are set in WebView after OAuth callback.

## Google Cloud Console Setup

Add these redirect URIs:
1. `http://72.61.182.248:5000/api/auth/google/callback` (development)
2. `https://YOUR_DOMAIN/api/auth/google/callback` (production)
3. `nutriai://auth/callback` (Android deep link)

## Common Issues

### Issue: Chrome Custom Tabs not opening
**Solution**: Ensure `androidx.browser:browser` dependency is added

### Issue: Deep link not working
**Solution**: 
1. Check AndroidManifest.xml has correct intent-filter
2. Verify scheme is "nutriai" and host is "auth"
3. Test with `adb shell am start`

### Issue: Cookies not persisting
**Solution**:
1. Ensure `CookieManager.setAcceptCookie(true)`
2. Call `cookieManager.flush()` after setting cookies
3. Check cookie domain matches BASE_URL

### Issue: OAuth still fails with Error 403
**Solution**: 
1. Verify you're using Chrome Custom Tabs, not WebView
2. Check `shouldOverrideUrlLoading` is intercepting OAuth URLs
3. Ensure `platform=mobile&return_url=true` parameters are present

## Production Checklist

- [ ] Update `BASE_URL` to production domain (https://your-domain.com)
- [ ] Add production callback URL to Google Cloud Console
- [ ] Test OAuth flow on physical device
- [ ] Test deep link handling
- [ ] Verify cookies persist across app restarts
- [ ] Test back button navigation
- [ ] Test with no internet connection (error handling)
- [ ] Add proper JSON parsing library (Gson or org.json)
- [ ] Add error handling for network requests
- [ ] Add loading indicators during OAuth

## Alternative: Use Native Google Sign-In

If Chrome Custom Tabs don't work well, consider implementing native Google Sign-In:

```gradle
dependencies {
    implementation 'com.google.android.gms:play-services-auth:20.7.0'
}
```

Then implement native Google Sign-In and send the token to your backend for verification. See `NATIVE-GOOGLE-SIGNIN-ANDROID.md` for details.
