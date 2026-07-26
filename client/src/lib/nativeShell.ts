/**
 * Native shell behaviour: status bar, splash screen and keyboard.
 *
 * These are the small things that separate "a website in an app icon" from
 * something that feels native — and they are also part of what App Review
 * looks at under Guideline 4.2. All of it no-ops on the web.
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Dark text on the light app background. Overlay is off so the web layer's
  // env(safe-area-inset-top) padding is what positions content, rather than
  // content sliding under the clock.
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* status bar is unavailable on iPad multitasking in some configurations */
  }

  // Resize the web view rather than the body: fixed-position footers (the
  // capture button, the bottom nav) stay put instead of being pushed offscreen.
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
  } catch {
    /* keyboard plugin is iOS/Android only */
  }

  // Expose keyboard height so layouts can react without guessing.
  Keyboard.addListener('keyboardWillShow', (info) => {
    document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    document.body.classList.add('keyboard-open');
  });
  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.style.setProperty('--keyboard-height', '0px');
    document.body.classList.remove('keyboard-open');
  });

  // Hide the splash only once the first paint has happened, so there is no
  // white flash between the launch image and the rendered app.
  requestAnimationFrame(() => {
    SplashScreen.hide().catch(() => {
      /* already hidden by launchAutoHide */
    });
  });

  // iOS has no hardware back button, but the swipe-back gesture surfaces here
  // too. Without a handler, the shell can exit the app from a nested screen.
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    }
  });
}
