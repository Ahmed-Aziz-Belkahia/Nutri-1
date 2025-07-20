/**
 * Android WebView and mobile browser optimizations
 * Ensures proper sticky/fixed positioning and touch behavior
 */

export function initializeWebViewOptimizations() {
  // Only run on mobile devices
  if (typeof window === 'undefined') return;

  // Detect Android WebView
  const isAndroidWebView = /Android.*wv\)/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Set viewport height fix for mobile browsers
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Initialize viewport height
  setViewportHeight();

  // Update on resize and orientation change
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 100);
  });

  // Force hardware acceleration for fixed elements
  const optimizeFixedElements = () => {
    const fixedElements = document.querySelectorAll('[class*="fixed"], .fixed-bottom-nav');
    fixedElements.forEach(element => {
      const el = element as HTMLElement;
      el.style.transform = 'translate3d(0, 0, 0)';
      el.style.webkitTransform = 'translate3d(0, 0, 0)';
      el.style.willChange = 'transform';
    });
  };

  // Android WebView specific fixes
  if (isAndroidWebView || isAndroid) {
    // Prevent elastic scrolling
    document.body.style.overscrollBehavior = 'none';
    
    // Force sticky positioning fallback
    const style = document.createElement('style');
    style.textContent = `
      .fixed-bottom-nav {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 9999 !important;
        transform: translate3d(0, 0, 0) !important;
        -webkit-transform: translate3d(0, 0, 0) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // iOS Safari specific fixes
  if (isIOS) {
    // Prevent zoom on input focus
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0'
      );
    }

    // Fix iOS Safari bottom navigation issues
    document.body.style.setProperty('-webkit-overflow-scrolling', 'touch');
  }

  // Apply optimizations on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeFixedElements);
  } else {
    optimizeFixedElements();
  }

  // Re-apply optimizations when content changes
  const observer = new MutationObserver(() => {
    optimizeFixedElements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Cleanup function
  return () => {
    window.removeEventListener('resize', setViewportHeight);
    window.removeEventListener('orientationchange', setViewportHeight);
    observer.disconnect();
  };
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  initializeWebViewOptimizations();
} else if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initializeWebViewOptimizations);
}