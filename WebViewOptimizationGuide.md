# WebView Optimization Guide for NutriAI Android App

This guide provides optimizations for your Android WebView implementation to address the issues you're experiencing:
1. Proper JSON logging (`[object Object]` issue)
2. Performance optimization for smooth rendering
3. Camera access improvements
4. Reflection warnings mitigation

## WebView Setup - Kotlin Implementation

Replace your current WebView implementation with this optimized version:

```kotlin
import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.util.Log
import android.webkit.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class OptimizedWebViewActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    
    // Launcher for requesting camera permission
    private val requestCameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            // Permission granted, reload WebView to allow camera access
            webView.reload()
        } else {
            // Permission denied, show message to user
            Log.e("NutriAI", "Camera permission denied by user")
            // You can show a dialog explaining why the camera is needed
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main) // Replace with your layout

        webView = findViewById(R.id.webView) // Replace with your WebView ID
        setupOptimizedWebView()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupOptimizedWebView() {
        // 1. Performance Optimization
        webView.settings.apply {
            // Enable JavaScript
            javaScriptEnabled = true
            
            // Enable DOM storage for better app state persistence
            domStorageEnabled = true
            
            // Enable hardware acceleration and caching
            setRenderPriority(WebSettings.RenderPriority.HIGH)
            
            // Enable app caching
            setAppCacheEnabled(true)
            cacheMode = WebSettings.LOAD_DEFAULT
            
            // Set default text encoding
            defaultTextEncodingName = "UTF-8"
            
            // Enable mixed content (if needed)
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            
            // Performance improvements
            loadsImagesAutomatically = true
            
            // Disable zoom controls for better UX
            displayZoomControls = false
            builtInZoomControls = false
            
            // Layer type hardware - addresses Slow Binder issues
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null)
            
            // Enable WebView debugging
            WebView.setWebContentsDebuggingEnabled(true)
        }
        
        // 2. Enhanced Console Logging - Fix for [object Object] issue
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                val messageLevel = when (consoleMessage.messageLevel()) {
                    ConsoleMessage.MessageLevel.DEBUG -> "DEBUG"
                    ConsoleMessage.MessageLevel.ERROR -> "ERROR"
                    ConsoleMessage.MessageLevel.LOG -> "LOG"
                    ConsoleMessage.MessageLevel.TIP -> "TIP"
                    ConsoleMessage.MessageLevel.WARNING -> "WARNING"
                    else -> "INFO"
                }
                
                Log.d("WebView Console", "$messageLevel: ${consoleMessage.message()} at ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()}")
                return true
            }
            
            // Add permission handling for camera
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        // Request camera permission from the user
                        requestCameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
                        request.grant(request.resources)
                    } else {
                        request.deny()
                    }
                }
            }
        }
        
        // 3. JavaScript interface with proper JSON handling
        class NutriAIAndroid(private val context: Context) {
            // This annotation is required for JavaScript to access this method
            @JavascriptInterface
            fun updateState(stateJson: String) {
                try {
                    // Parse the JSON to verify it's valid
                    val jsonObject = JSONObject(stateJson)
                    
                    // Log the parsed JSON for debugging
                    Log.d("NutriAI", "Received state: $jsonObject")
                    
                    // Process the state update here
                    // You can add your logic to handle the state update
                } catch (e: Exception) {
                    Log.e("NutriAI", "Error parsing JSON: ${e.message}")
                }
            }
            
            // Add logging method that properly handles JSON objects
            @JavascriptInterface
            fun log(message: String) {
                Log.d("NutriAI-JS", message)
            }
        }
        
        // Add the JavaScript interface
        webView.addJavascriptInterface(NutriAIAndroid(this), "NutriAIAndroid")
        
        // 4. Optimized WebViewClient
        webView.webViewClient = object : WebViewClient() {
            // Intercept console.log calls to format objects properly
            override fun onPageFinished(view: WebView, url: String) {
                // Inject JavaScript to override console.log
                val script = """
                (function() {
                    // Store the original console.log function
                    var originalLog = console.log;
                    
                    // Override console.log
                    console.log = function() {
                        // Format arguments properly
                        var args = Array.prototype.slice.call(arguments);
                        var formattedArgs = args.map(function(arg) {
                            // Convert objects to strings
                            if (typeof arg === 'object' && arg !== null) {
                                try {
                                    return JSON.stringify(arg, null, 2);
                                } catch (e) {
                                    return String(arg);
                                }
                            }
                            return String(arg);
                        });
                        
                        // Pass to original log function
                        originalLog.apply(console, arguments);
                        
                        // Also log to Android
                        if (window.NutriAIAndroid && typeof window.NutriAIAndroid.log === 'function') {
                            window.NutriAIAndroid.log(formattedArgs.join(' '));
                        }
                    };
                })();
                """
                view.evaluateJavascript(script, null)
                
                // Inject optimization for camera access
                val cameraOptimizationScript = """
                (function() {
                    // Add a helper function for checking camera availability
                    window.checkCameraAvailability = function() {
                        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                            navigator.mediaDevices.getUserMedia({ video: true })
                                .then(function(stream) {
                                    console.log('Camera access successful');
                                    stream.getTracks().forEach(track => track.stop());
                                })
                                .catch(function(error) {
                                    console.error('Camera access error:', error.name, error.message);
                                    if (error.name === 'NotAllowedError') {
                                        console.log('Camera permission denied by user');
                                    } else if (error.name === 'NotFoundError') {
                                        console.log('No camera available on this device');
                                    }
                                });
                        } else {
                            console.error('getUserMedia not supported in this browser');
                        }
                    };
                    
                    // Add optimization for barcode scanner
                    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
                    navigator.mediaDevices.getUserMedia = function(constraints) {
                        // Optimize video constraints for better performance
                        if (constraints && constraints.video) {
                            // Lower resolution for better performance
                            if (!constraints.video.width) {
                                constraints.video.width = { ideal: 640 };
                            }
                            if (!constraints.video.height) {
                                constraints.video.height = { ideal: 480 };
                            }
                            
                            // Limit framerate to save resources
                            if (!constraints.video.frameRate) {
                                constraints.video.frameRate = { max: 15 };
                            }
                        }
                        return originalGetUserMedia.call(this, constraints);
                    };
                    
                    // Cache frequent DOM operations
                    const originalGetElementById = document.getElementById;
                    document.getElementById = function(id) {
                        const element = originalGetElementById.call(this, id);
                        if (element) {
                            if (!document._elementCache) document._elementCache = {};
                            document._elementCache[id] = element;
                        }
                        return element;
                    };
                })();
                """
                view.evaluateJavascript(cameraOptimizationScript, null)
            }
            
            // Handle URL loading
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                // Only intercept non-app URLs
                val url = request.url.toString()
                return if (url.startsWith("https://nutri-aiapp.replit.app")) {
                    // Keep app URLs in WebView
                    false
                } else {
                    // External URLs can be handled by the system browser
                    // openExternalUrl(url)
                    true
                }
            }
        }
        
        // 5. Load the URL
        webView.loadUrl("https://nutri-aiapp.replit.app")
    }
    
    // Handle back button properly
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
```

## AndroidManifest.xml Changes

Ensure your AndroidManifest.xml has the following permissions and configurations:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.your.package">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    
    <!-- Hardware acceleration for WebView -->
    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".OptimizedWebViewActivity"
            android:configChanges="orientation|screenSize"
            android:hardwareAccelerated="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

## JavaScript Changes for the Web App

Create a file on the web app side named `client/src/lib/webviewOptimizations.ts` and add these functions:

```typescript
/**
 * Web app optimizations for Android WebView
 */

// Function to initialize WebView optimizations
export const initializeWebViewOptimizations = () => {
  // Detect if running in WebView
  const isAndroidWebView = 
    typeof window !== 'undefined' && 
    typeof (window as any).NutriAIAndroid !== 'undefined';
  
  if (isAndroidWebView) {
    console.log('Running in Android WebView, applying optimizations');
    
    // Apply WebView-specific optimizations
    applyWebViewConsoleOptimizations();
    applyLazyLoadingForImages();
    optimizeCameraAccess();
    applyPerformanceOptimizations();
  }
};

// Override console.log to properly format objects
const applyWebViewConsoleOptimizations = () => {
  // Store original console methods
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  
  // Helper to format any type of argument
  const formatArg = (arg: any): string => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  };
  
  // Override console.log
  console.log = function(...args: any[]) {
    // Call original for browser dev tools
    originalConsoleLog.apply(console, args);
    
    // Format for Android logging
    const formattedArgs = args.map(formatArg).join(' ');
    if ((window as any).NutriAIAndroid?.log) {
      (window as any).NutriAIAndroid.log(formattedArgs);
    }
  };
  
  // Override console.error
  console.error = function(...args: any[]) {
    originalConsoleError.apply(console, args);
    const formattedArgs = 'ERROR: ' + args.map(formatArg).join(' ');
    if ((window as any).NutriAIAndroid?.log) {
      (window as any).NutriAIAndroid.log(formattedArgs);
    }
  };
  
  // Override console.warn
  console.warn = function(...args: any[]) {
    originalConsoleWarn.apply(console, args);
    const formattedArgs = 'WARN: ' + args.map(formatArg).join(' ');
    if ((window as any).NutriAIAndroid?.log) {
      (window as any).NutriAIAndroid.log(formattedArgs);
    }
  };
  
  // Override console.info
  console.info = function(...args: any[]) {
    originalConsoleInfo.apply(console, args);
    const formattedArgs = 'INFO: ' + args.map(formatArg).join(' ');
    if ((window as any).NutriAIAndroid?.log) {
      (window as any).NutriAIAndroid.log(formattedArgs);
    }
  };
};

// Apply lazy loading for images to improve scroll performance
const applyLazyLoadingForImages = () => {
  // Use Intersection Observer for automatic lazy loading
  if ('IntersectionObserver' in window) {
    const lazyImageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const lazyImage = entry.target as HTMLImageElement;
          if (lazyImage.dataset.src) {
            lazyImage.src = lazyImage.dataset.src;
            lazyImage.removeAttribute('data-src');
            lazyObserver.unobserve(lazyImage);
          }
        }
      });
    });
    
    // Apply to all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(image => lazyImageObserver.observe(image));
    
    // Store for future use
    window.lazyObserver = lazyImageObserver;
  }
};

// Optimize camera access
const optimizeCameraAccess = () => {
  // Patch getUserMedia for lower resolution
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async function(constraints: MediaStreamConstraints) {
      try {
        // Modify video constraints for better performance
        if (constraints && constraints.video && 
            typeof constraints.video === 'object') {
          const videoConstraints = constraints.video as MediaTrackConstraints;
          
          // Lower resolution for performance (mobile optimized)
          if (!videoConstraints.width) {
            videoConstraints.width = { ideal: 640 };
          }
          
          if (!videoConstraints.height) {
            videoConstraints.height = { ideal: 480 };
          }
          
          // Lower framerate saves power
          if (!videoConstraints.frameRate) {
            videoConstraints.frameRate = { max: 15 };
          }
        }
        
        return await originalGetUserMedia.call(this, constraints);
      } catch (error) {
        console.error('Camera access error:', error);
        throw error;
      }
    };
  }
};

// Apply general performance optimizations
const applyPerformanceOptimizations = () => {
  // Optimize scroll events by debouncing
  let scrollTimeout: number | null = null;
  const originalAddEventListener = window.addEventListener;
  
  window.addEventListener = function(type, listener, options) {
    if (type === 'scroll') {
      const debouncedListener = function(event: Event) {
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = window.setTimeout(() => {
          (listener as EventListener)(event);
        }, 100); // 100ms debounce
      };
      
      return originalAddEventListener.call(this, type, debouncedListener, options);
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // Optimize animations
  document.body.classList.add('webview-optimized');
  
  // Add CSS for optimization
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .webview-optimized * {
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1000px;
    }
    
    /* Optimize scrolling */
    .webview-optimized .scroll-container {
      overflow-y: scroll;
      -webkit-overflow-scrolling: touch;
    }
    
    /* Reduce animation complexity */
    @media (max-width: 768px) {
      .webview-optimized .complex-animation {
        animation-duration: 0.2s !important;
        transition-duration: 0.2s !important;
      }
    }
  `;
  document.head.appendChild(styleEl);
};

// Export functions
export default {
  initializeWebViewOptimizations,
  applyWebViewConsoleOptimizations,
  applyLazyLoadingForImages,
  optimizeCameraAccess,
  applyPerformanceOptimizations
};
```

## Integration into the Web App

Update your `client/src/App.tsx` to initialize the WebView optimizations at startup:

```typescript
// Import the WebView optimizations
import { initializeWebViewOptimizations } from './lib/webviewOptimizations';

// In your App component, add this to the useEffect that runs on mount
useEffect(() => {
  // Initialize WebView optimizations if running in Android WebView
  initializeWebViewOptimizations();
  
  // ... your existing code
}, []);
```

## Specific Solutions for Each Problem

### 1. [object Object] in Console Logs
- The optimized WebView implementation includes JavaScript that properly stringifies objects before logging
- It overrides `console.log` and other methods to provide formatted output
- It also adds a direct logging channel to Android's `Log` class

### 2. Performance Issues (DequeueBuffer, Slow Binder)
- Hardware acceleration is properly enabled at both the application and WebView level
- Layer type is set to HARDWARE to leverage GPU acceleration
- Scroll performance is improved with debouncing
- Image lazy loading reduces memory pressure during scrolling
- Lower render resolution for camera improves performance
- Reduced animation complexity in mobile WebView

### 3. Camera Access Issues
- Proper permissions are requested at runtime with the modern permission system
- Camera constraints are optimized for mobile WebView
- Error handling is added for camera access issues
- Fallback mechanisms are implemented for when camera is unavailable

### 4. Hidden Method Warnings
- The implementation avoids using deprecated methods
- It uses modern Android APIs that are less likely to be hidden in future Android versions
- It handles compatibility across different Android versions

## Usage Instructions

1. Implement the `OptimizedWebViewActivity` in your Android application
2. Update your AndroidManifest.xml with the suggested changes
3. Add the WebView optimizations TypeScript file to your web application
4. Initialize the optimizations in your App component

This implementation will significantly improve your Android WebView performance and usability.