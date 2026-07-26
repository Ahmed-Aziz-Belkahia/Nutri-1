import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the iOS build.
 *
 * NOTE ON `appId`: this becomes the iOS bundle identifier and is effectively
 * permanent once the app exists in App Store Connect. It is reverse-DNS of the
 * domain the project already controls (nutriai.online). Change it now if you
 * want something else — not after the first submission.
 *
 * The web assets are bundled into the app and served from capacitor://localhost,
 * so the app is NOT a remote-URL wrapper (`server.url` is deliberately unset —
 * pointing it at the live site is the classic App Store Guideline 4.2 rejection).
 * API calls are rewritten to API_BASE_URL at runtime by client/src/lib/nativeApi.ts.
 */
const config: CapacitorConfig = {
  appId: 'online.nutriai.app',
  appName: 'NutriAI',
  webDir: 'dist/public',

  ios: {
    // Opaque background avoids a white flash between splash and first paint.
    backgroundColor: '#ffffff',
    // Let the web layer own the safe-area insets via env(safe-area-inset-*).
    contentInset: 'never',
    // Links to other sites open in the system browser rather than navigating
    // the app's own WebView away from the bundle.
    limitsNavigationsToAppBoundDomains: true
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#ffffff',
      showSpinner: false,
      launchAutoHide: true
    },
    Keyboard: {
      // Resize the web view rather than the body so fixed footers behave.
      resize: 'native' as any
    }
  }
};

export default config;
