/**
 * Sign in with Apple (native only).
 *
 * Runs Apple's authorization sheet, then exchanges the resulting identity token
 * with our server, which verifies it against Apple's public keys and returns
 * our own session tokens.
 *
 * Apple returns the user's name and email ONLY on the very first authorization
 * for a given Apple ID + app pair. They are forwarded to the server on that one
 * occasion; every subsequent sign-in is matched on the stable `sub` inside the
 * identity token, so nothing here depends on them being present.
 */

import { SignInWithApple, type SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { isNative, setTokens } from './nativeApi';

export interface AppleSignInResult {
  ok: true;
  user: {
    id: number;
    email: string;
    hasCompletedOnboarding?: boolean;
  };
}

export class AppleSignInError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'AppleSignInError';
  }
}

/** Sign in with Apple is only offered in the native iOS app. */
export function isAppleSignInAvailable(): boolean {
  return isNative();
}

export async function signInWithApple(): Promise<AppleSignInResult | null> {
  if (!isNative()) {
    throw new AppleSignInError('Sign in with Apple is only available in the iOS app.');
  }

  let result: SignInWithAppleResponse;
  try {
    result = await SignInWithApple.authorize({
      // clientId/redirectURI are only consulted by the web fallback; native
      // sign-in uses the app's own bundle identifier as the audience.
      clientId: 'online.nutriai.app',
      redirectURI: '',
      scopes: 'email name'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The user dismissing the sheet is not a failure worth surfacing.
    if (/cancel/i.test(message) || /1001/.test(message)) {
      return null;
    }
    throw new AppleSignInError(message);
  }

  const identityToken = result.response?.identityToken;
  if (!identityToken) {
    throw new AppleSignInError('Apple did not return an identity token.');
  }

  const res = await fetch('/api/auth/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identityToken,
      givenName: result.response?.givenName ?? undefined,
      familyName: result.response?.familyName ?? undefined
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new AppleSignInError(data?.message || data?.error || 'Apple sign-in failed', data?.error);
  }

  // Native has no usable session cookie; persist the bearer tokens.
  await setTokens(data.accessToken, data.refreshToken);

  return { ok: true, user: data.user };
}
