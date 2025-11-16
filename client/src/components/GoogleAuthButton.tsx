import React from 'react';

interface GoogleAuthButtonProps {
  mode?: 'login' | 'register';
  className?: string;
}

export function GoogleAuthButton({ 
  mode = 'login', 
  className = '' 
}: GoogleAuthButtonProps) {
  
  // Detect if running in a WebView
  const isWebView = () => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipod|ipad/.test(ua);
    const isAndroid = /android/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
    const isChrome = /chrome/.test(ua);
    
    return (
      (isIOS && !isSafari) ||
      (isAndroid && !isChrome) ||
      ua.includes('wv') ||
      ua.includes('webview')
    );
  };

  const handleGoogleAuth = () => {
    const authUrl = `${window.location.origin}/api/auth/google`;
    
    // If in WebView, try to open in system browser
    if (isWebView()) {
      // Try to copy URL to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(authUrl).then(() => {
          alert('✅ URL copied to clipboard!\n\nGoogle Sign-In must be opened in your default browser (Safari or Chrome).\n\nThe URL has been copied. Please paste it in your browser.');
        }).catch(() => {
          alert('Google Sign-In must be opened in your default browser.\n\nPlease copy and open this URL in Safari or Chrome:\n\n' + authUrl);
        });
      } else {
        alert('Google Sign-In must be opened in your default browser.\n\nPlease copy and open this URL in Safari or Chrome:\n\n' + authUrl);
      }
      return;
    }
    
    // Normal browser - just redirect
    window.location.href = authUrl;
  };

  const buttonText = mode === 'login' 
    ? 'Sign in with Google' 
    : 'Sign up with Google';

  return (
    <button
      onClick={handleGoogleAuth}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow ${className}`}
      type="button"
    >
      {/* Google Logo SVG */}
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 48 48" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          fill="#EA4335" 
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path 
          fill="#4285F4" 
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path 
          fill="#FBBC05" 
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path 
          fill="#34A853" 
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
        <path fill="none" d="M0 0h48v48H0z" />
      </svg>
      
      <span>{buttonText}</span>
    </button>
  );
}
