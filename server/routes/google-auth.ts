import { Router } from 'express';
import passport from '../auth/passport-google';
import type { Request, Response } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  getTokenExpiryDates,
} from '../utils/jwt';

const router = Router();

/**
 * Initiate Google OAuth flow
 * GET /api/auth/google
 *
 * For WebView apps: call with ?platform=mobile&return_url=true to get the auth URL
 * and open it in a system browser (Chrome Custom Tabs / SFSafariViewController).
 * For web browsers: redirects directly to Google.
 */
router.get('/google', (req: Request, res: Response, next) => {
  const platform = req.query.platform as string;
  const isMobileApp = platform === 'mobile';

  // For mobile WebView apps: return the OAuth URL instead of redirecting
  // Google blocks OAuth in embedded WebViews — the app must open it in system browser
  if (isMobileApp && req.query.return_url === 'true') {
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({ error: 'Google OAuth is not configured' });
    }

    const state = encodeURIComponent(JSON.stringify({ platform: 'mobile' }));

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('profile email openid')}` +
      `&state=${state}` +
      `&access_type=online`;

    return res.json({ success: true, authUrl: googleAuthUrl });
  }

  // Standard web browser flow — redirect directly to Google
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    ...(isMobileApp ? { state: JSON.stringify({ platform: 'mobile' }) } : {}),
  } as any)(req, res, next);
});

/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 *
 * Google redirects here after the user authenticates.
 * We set JWT cookies and redirect to /auth/google/success.
 * Tokens are NEVER passed in the URL for security.
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth?error=google_auth_failed',
  }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.redirect('/auth?error=authentication_failed');
      }

      // Generate JWT tokens (same policy as jwt-auth.ts)
      const accessToken = generateAccessToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id, user.email);

      // Store refresh token in DB
      const { refreshTokenExpiry } = getTokenExpiryDates();
      await storeRefreshToken(user.id, refreshToken, refreshTokenExpiry);

      const isProduction = process.env.NODE_ENV === 'production';

      // Set access token cookie — 1 day (matching jwt-auth.ts)
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      // Set refresh token cookie — 365 days (matching jwt-auth.ts)
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      // Redirect to the success page — cookies are set, frontend will pick them up
      // Do NOT put tokens in the URL
      return res.redirect('/auth/google/success');
    } catch (error) {
      console.error('[Google OAuth] Callback error:', error);
      return res.redirect('/auth?error=callback_failed');
    }
  }
);

/**
 * Google auth success status
 * GET /api/auth/google/status
 *
 * The frontend polls this after opening the system browser to detect
 * when the auth flow is complete. Returns ok:true if cookies are set.
 */
router.get('/google/status', (req: Request, res: Response) => {
  const hasToken = Boolean(req.cookies?.accessToken);
  res.json({ authenticated: hasToken });
});

export default router;
