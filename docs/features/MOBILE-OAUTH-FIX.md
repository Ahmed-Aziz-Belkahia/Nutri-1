# Mobile OAuth Fix - Google Sign In

## Problem
Google blocks OAuth authentication in embedded webviews with **Error 403: disallowed_useragent**. This is a security policy to prevent phishing attacks.

## Solution
The mobile app must open OAuth in a **secure browser context** instead of a webview:
- **Android**: Use Chrome Custom Tabs
- **iOS**: Use SFSafariViewController

## Backend Implementation

### New Endpoint Behavior
When `platform=mobile` and `return_url=true`, the endpoint returns the OAuth URL as JSON instead of redirecting:

```bash
GET /api/auth/google?platform=mobile&return_url=true
```

Response:
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "message": "Open this URL in Chrome Custom Tabs (Android) or SFSafariViewController (iOS)",
  "instructions": "The mobile app should open this URL in a secure browser component, not a webview"
}
```

### Callback Flow
After successful OAuth, the callback will redirect to:
```
nutriai://auth/success?onboarding=true/false&access=<JWT>&refresh=<JWT>
```

## Mobile App Integration

### React Native Example (Expo)

#### 1. Install Dependencies
```bash
npx expo install expo-web-browser expo-auth-session
```

#### 2. Configure Deep Linking
**app.json:**
```json
{
  "expo": {
    "scheme": "nutriai",
    "ios": {
      "bundleIdentifier": "com.nutriai.app"
    },
    "android": {
      "package": "com.nutriai.app"
    }
  }
}
```

#### 3. Implement OAuth
```typescript
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest } from 'expo-auth-session';

// Enable result handling
WebBrowser.maybeCompleteAuthSession();

async function handleGoogleSignIn() {
  try {
    // Get OAuth URL from backend
    const response = await fetch(
      'http://YOUR_SERVER/api/auth/google?platform=mobile&return_url=true'
    );
    const { authUrl } = await response.json();
    
    // Open in secure browser (Chrome Custom Tabs / SFSafariViewController)
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      'nutriai://auth/callback'
    );
    
    if (result.type === 'success' && result.url) {
      // Parse tokens from deep link
      const url = new URL(result.url);
      const accessToken = url.searchParams.get('access');
      const refreshToken = url.searchParams.get('refresh');
      const needsOnboarding = url.searchParams.get('onboarding') === 'true';
      
      // Store tokens and navigate
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      
      if (needsOnboarding) {
        navigation.navigate('Onboarding');
      } else {
        navigation.navigate('Dashboard');
      }
    }
  } catch (error) {
    console.error('OAuth error:', error);
    Alert.alert('Authentication failed', 'Please try again');
  }
}
```

### Native iOS (Swift) Example

```swift
import AuthenticationServices

class AuthViewController: UIViewController, ASWebAuthenticationPresentationContextProviding {
    
    func signInWithGoogle() {
        // Get OAuth URL from backend
        let urlString = "http://YOUR_SERVER/api/auth/google?platform=mobile&return_url=true"
        guard let url = URL(string: urlString) else { return }
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let authUrl = json["authUrl"] as? String,
                  let authURL = URL(string: authUrl) else { return }
            
            DispatchQueue.main.async {
                // Use SFSafariViewController
                let session = ASWebAuthenticationSession(
                    url: authURL,
                    callbackURLScheme: "nutriai"
                ) { callbackURL, error in
                    if let callbackURL = callbackURL {
                        self.handleCallback(url: callbackURL)
                    }
                }
                
                session.presentationContextProvider = self
                session.start()
            }
        }.resume()
    }
    
    func handleCallback(url: URL) {
        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let accessToken = components?.queryItems?.first(where: { $0.name == "access" })?.value
        let refreshToken = components?.queryItems?.first(where: { $0.name == "refresh" })?.value
        
        // Store tokens and navigate
        UserDefaults.standard.set(accessToken, forKey: "accessToken")
        UserDefaults.standard.set(refreshToken, forKey: "refreshToken")
    }
    
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return view.window!
    }
}
```

### Native Android (Kotlin) Example

```kotlin
import androidx.browser.customtabs.CustomTabsIntent
import android.net.Uri

class AuthActivity : AppCompatActivity() {
    
    private suspend fun signInWithGoogle() {
        try {
            // Get OAuth URL from backend
            val response = ktorClient.get("http://YOUR_SERVER/api/auth/google") {
                parameter("platform", "mobile")
                parameter("return_url", "true")
            }
            val authUrl = response.body<JsonObject>()["authUrl"].jsonPrimitive.content
            
            // Open in Chrome Custom Tabs
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            
            customTabsIntent.launchUrl(this, Uri.parse(authUrl))
        } catch (e: Exception) {
            Log.e("Auth", "OAuth error", e)
            Toast.makeText(this, "Authentication failed", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        
        // Handle deep link callback
        intent?.data?.let { uri ->
            if (uri.scheme == "nutriai" && uri.host == "auth") {
                val accessToken = uri.getQueryParameter("access")
                val refreshToken = uri.getQueryParameter("refresh")
                val needsOnboarding = uri.getQueryParameter("onboarding") == "true"
                
                // Store tokens
                sharedPreferences.edit()
                    .putString("accessToken", accessToken)
                    .putString("refreshToken", refreshToken)
                    .apply()
                
                // Navigate
                if (needsOnboarding) {
                    startActivity(Intent(this, OnboardingActivity::class.java))
                } else {
                    startActivity(Intent(this, DashboardActivity::class.java))
                }
                finish()
            }
        }
    }
}
```

## Testing

### 1. Test URL Generation
```bash
curl "http://localhost:5000/api/auth/google?platform=mobile&return_url=true"
```

Expected response:
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  "message": "Open this URL in Chrome Custom Tabs..."
}
```

### 2. Test Deep Link Handling
After OAuth completes, you should receive:
```
nutriai://auth/success?onboarding=false&access=eyJ...&refresh=eyJ...
```

### 3. Test Token Validity
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:5000/api/user/profile
```

## Troubleshooting

### Issue: "Error 403: disallowed_useragent" still appears
**Cause**: Mobile app is still using webview instead of Chrome Custom Tabs/SFSafariViewController  
**Solution**: Update mobile app to use the secure browser components shown above

### Issue: Deep link doesn't open the app
**Cause**: Deep link scheme not registered  
**Solutions**:
- **iOS**: Add `nutriai://` to Info.plist URL Schemes
- **Android**: Add intent-filter in AndroidManifest.xml
- **Expo**: Add `"scheme": "nutriai"` to app.json

### Issue: Tokens not received in callback
**Cause**: Callback URL mismatch or parsing error  
**Solution**: 
1. Check callback URL in Google Cloud Console matches backend
2. Verify deep link parsing extracts query parameters correctly

### Issue: OAuth works on web but not mobile
**Cause**: This is expected - web uses redirect flow, mobile needs secure browser  
**Solution**: Ensure mobile app uses `return_url=true` parameter and opens URL in Chrome Custom Tabs/SFSafariViewController

## Google Cloud Console Configuration

### Add Mobile Callback URLs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services > Credentials**
4. Click your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs**:
   - `http://localhost:5000/api/auth/google/callback` (development)
   - `https://YOUR_PRODUCTION_DOMAIN/api/auth/google/callback` (production)
   - `nutriai://auth/callback` (mobile deep link)

## Security Notes

✅ **Secure**: Chrome Custom Tabs and SFSafariViewController use the system browser, preventing phishing  
✅ **User-Friendly**: Users see familiar Google login UI  
✅ **Privacy**: Apps cannot intercept login credentials  
❌ **Insecure**: Webviews can be manipulated by the app  

## References

- [Google's OAuth 2.0 Policies](https://developers.google.com/identity/protocols/oauth2/policies)
- [Chrome Custom Tabs (Android)](https://developer.chrome.com/docs/android/custom-tabs/)
- [SFSafariViewController (iOS)](https://developer.apple.com/documentation/safariservices/sfsafariviewcontroller)
- [Expo Web Browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
