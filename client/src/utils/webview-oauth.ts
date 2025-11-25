// WebView OAuth Helper
// Add this to your login page to handle WebView OAuth

export function isAndroidWebView(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /wv/.test(ua) || /android.*version\/\d+\.\d+.*chrome/.test(ua);
}

export function hasAndroidBridge(): boolean {
  return typeof (window as any).Android !== 'undefined';
}

export async function initiateOAuthInWebView() {
  if (hasAndroidBridge()) {
    // Use Android bridge to open OAuth in Chrome Custom Tabs
    try {
      const response = await fetch('/api/auth/google?platform=mobile&return_url=true', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authUrl) {
        // Call Android bridge method
        (window as any).Android.openOAuthInBrowser(data.authUrl);
      }
    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      // Fallback to regular OAuth
      window.location.href = '/api/auth/google?platform=mobile';
    }
  } else if (isAndroidWebView()) {
    // No bridge available, try regular OAuth with platform parameter
    // The WebView should intercept this URL
    window.location.href = '/api/auth/google?platform=mobile';
  } else {
    // Regular web browser
    window.location.href = '/api/auth/google';
  }
}

// Check if we were redirected from OAuth callback
export function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check if this is an OAuth success callback
  if (urlParams.has('oauth_success') && urlParams.get('oauth_success') === 'true') {
    // Cookies should already be set by the backend
    const needsOnboarding = urlParams.get('onboarding') === 'true';
    
    if (needsOnboarding) {
      window.location.href = '/onboarding';
    } else {
      window.location.href = '/dashboard';
    }
  }
}

// Export types for TypeScript
declare global {
  interface Window {
    Android?: {
      openOAuthInBrowser: (url: string) => void;
    };
  }
}
