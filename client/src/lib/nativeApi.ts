/**
 * Native (Capacitor) API bridging.
 *
 * On the web the app is served from the same origin as the API, so relative
 * `/api/...` calls and httpOnly session cookies work. Inside a Capacitor
 * WebView neither holds:
 *
 *   1. The bundle is served from capacitor://localhost, so `/api/...` resolves
 *      against the local bundle and 404s. Requests need an absolute origin.
 *   2. The auth cookies are httpOnly + SameSite=Lax, so they are neither
 *      readable from JS nor sent cross-site. The server already accepts
 *      `Authorization: Bearer <token>`, so native uses header auth instead.
 *
 * Rather than edit ~55 call sites, this installs a single `fetch` interceptor
 * that rewrites the URL and attaches the bearer token. Nothing else in the app
 * needs to know which platform it is running on.
 *
 * On the web the interceptor is a no-op, so behaviour is unchanged.
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import axios from 'axios';

const ACCESS_TOKEN_KEY = 'nutriai_access_token';
const REFRESH_TOKEN_KEY = 'nutriai_refresh_token';

/** Absolute origin of the API when running natively. Configure per build. */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** Header that tells the server to return tokens in the body, not just cookies. */
export const PLATFORM_HEADER = 'X-Client-Platform';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// Cached in memory so the interceptor stays synchronous-ish on the hot path;
// Preferences is the durable store that survives app restarts.
let accessTokenCache: string | null = null;

export async function loadStoredTokens(): Promise<void> {
  if (!isNative()) return;
  const { value } = await Preferences.get({ key: ACCESS_TOKEN_KEY });
  accessTokenCache = value ?? null;
}

export async function setTokens(accessToken?: string | null, refreshToken?: string | null): Promise<void> {
  if (!isNative()) return;
  if (accessToken) {
    accessTokenCache = accessToken;
    await Preferences.set({ key: ACCESS_TOKEN_KEY, value: accessToken });
  }
  if (refreshToken) {
    await Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken });
  }
}

export async function clearTokens(): Promise<void> {
  accessTokenCache = null;
  if (!isNative()) return;
  await Preferences.remove({ key: ACCESS_TOKEN_KEY });
  await Preferences.remove({ key: REFRESH_TOKEN_KEY });
}

export async function getRefreshToken(): Promise<string | null> {
  if (!isNative()) return null;
  const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
  return value ?? null;
}

/** Resolve a possibly-relative request URL against the API origin. */
function resolveUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!isNative() || !API_BASE_URL) return input;

  const rewrite = (url: string) => (url.startsWith('/') ? API_BASE_URL + url : url);

  if (typeof input === 'string') return rewrite(input);
  if (input instanceof URL) return input;
  if (input instanceof Request && input.url.startsWith('capacitor://')) {
    // Strip the custom-scheme origin the WebView prepended to a relative path.
    const path = input.url.replace(/^capacitor:\/\/localhost/, '');
    return new Request(rewrite(path), input);
  }
  return input;
}

let installed = false;

/**
 * Patch window.fetch so every relative /api call is sent to the real API with
 * bearer auth. Idempotent; safe to call once at startup on any platform.
 */
export function installNativeApiInterceptor(): void {
  if (installed || !isNative()) return;
  installed = true;

  if (!API_BASE_URL) {
    // Loud on purpose: without this the native build silently cannot reach the
    // API, which is confusing to debug from inside a WebView.
    console.error(
      '[nativeApi] VITE_API_BASE_URL is not set. API requests from the native ' +
        'app will fail. Set it at build time to the https origin of the API.'
    );
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = resolveUrl(input);

    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set(PLATFORM_HEADER, 'ios');
    if (accessTokenCache && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessTokenCache}`);
    }

    // Cookies are useless across the custom scheme; omit so the server does not
    // see a partial/stale session and prefer the bearer token instead.
    return originalFetch(url, { ...init, headers, credentials: 'omit' });
  };

  // axios uses XMLHttpRequest, not fetch, so the patch above does not cover it.
  // The auth hook and profile page both call axios directly.
  axios.interceptors.request.use((cfg) => {
    if (API_BASE_URL && cfg.url?.startsWith('/')) {
      cfg.url = API_BASE_URL + cfg.url;
    }
    cfg.headers.set(PLATFORM_HEADER, 'ios');
    if (accessTokenCache && !cfg.headers.has('Authorization')) {
      cfg.headers.set('Authorization', `Bearer ${accessTokenCache}`);
    }
    cfg.withCredentials = false;
    return cfg;
  });

  axios.interceptors.response.use(async (res) => {
    await captureTokensFromResponse(res.data);
    return res;
  });
}

/**
 * Pull tokens out of an auth response body and persist them.
 * The server only includes these when the platform header is present.
 */
export async function captureTokensFromResponse(body: unknown): Promise<void> {
  if (!isNative() || !body || typeof body !== 'object') return;
  const { accessToken, refreshToken } = body as { accessToken?: string; refreshToken?: string };
  if (accessToken || refreshToken) {
    await setTokens(accessToken, refreshToken);
  }
}
