// Centralized camera permission utilities
// Safely checks camera permission state and requests access using the OS-native prompt.

export type CameraPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function getCameraPermissionStatus(): Promise<CameraPermissionState> {
  try {
    // Some browsers (Safari iOS) don't support Permissions API for 'camera'
    if (!('permissions' in navigator) || !('mediaDevices' in navigator)) {
      return 'unsupported';
    }

  const status: PermissionStatus = await (navigator as any).permissions.query({ name: 'camera' });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    // Fallback when querying isn't supported or throws
    return 'unsupported';
  }
}

export interface RequestCameraResult {
  granted: boolean;
  denied?: boolean;
  error?: string;
}

export async function requestCameraPermission(options?: { facingMode?: 'user' | 'environment' }): Promise<RequestCameraResult> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    return { granted: false, error: 'Camera not supported on this device/browser.' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: options?.facingMode ?? 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });

    // Immediately stop tracks — this request is only to trigger the OS permission prompt.
    stream.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch (err: any) {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
      return { granted: false, denied: true, error: 'Camera permission denied.' };
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return { granted: false, error: 'No camera found or constraints not met.' };
    }
    return { granted: false, error: err?.message || 'Failed to request camera permission.' };
  }
}
