/**
 * Camera capture that prefers the native iOS camera over getUserMedia.
 *
 * Two reasons this matters, beyond image quality:
 *
 *  1. getUserMedia inside a WKWebView is historically unreliable and needs the
 *     right entitlements even when it does work. The native plugin is the
 *     supported path.
 *  2. App Store Guideline 4.2 (Minimum Functionality) is the main rejection
 *     risk for a WebView-shelled app. Using real device capabilities rather
 *     than browser APIs is a large part of not reading as "a website in a
 *     wrapper".
 *
 * On the web this falls back to the existing react-webcam flow, so nothing
 * changes in a browser.
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNative } from './nativeApi';

export type CaptureSource = 'camera' | 'photos';

/** True when capture should go through the native plugin instead of <Webcam>. */
export function useNativeCamera(): boolean {
  return isNative();
}

/**
 * Open the native camera (or photo picker) and return a base64 data URL,
 * or null if the user cancelled.
 *
 * Throws only on real failures — a cancellation is not an error, because every
 * caller treats a thrown error as "analysis failed" and shows a toast.
 */
export async function captureNativePhoto(source: CaptureSource = 'camera'): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === 'photos' ? CameraSource.Photos : CameraSource.Camera,
      // Meal and ingredient shots are analysed by a vision model; capping the
      // long edge keeps the upload small without hurting recognition.
      width: 1600,
      correctOrientation: true,
      presentationStyle: 'fullscreen'
    });

    return photo.dataUrl ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The plugin reports user cancellation as a thrown error; treat it as a
    // no-op rather than surfacing a failure toast.
    if (/cancel/i.test(message) || /User cancelled/i.test(message)) {
      return null;
    }
    throw error;
  }
}

/** Ask for camera permission up front so the prompt is tied to a user action. */
export async function ensureCameraPermission(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const status = await Camera.checkPermissions();
    if (status.camera === 'granted') return true;
    const requested = await Camera.requestPermissions({ permissions: ['camera'] });
    return requested.camera === 'granted';
  } catch {
    return false;
  }
}

/** Short tap feedback on capture. No-op on web. */
export async function captureFeedback(): Promise<void> {
  if (!isNative()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* haptics are cosmetic — never let them break a capture */
  }
}
