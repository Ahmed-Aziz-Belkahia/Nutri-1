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
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

/**
 * Google OAuth callback
 * GET /api/auth/google/callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=google_auth_failed',
  }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.redirect('/login?error=authentication_failed');
      }

      // Generate JWT tokens (same as normal login)
      const accessToken = generateAccessToken(user.id, user.email);
      const refreshToken = generateRefreshToken(user.id, user.email);

      // Store refresh token in database
      const { refreshTokenExpiry } = getTokenExpiryDates();
      storeRefreshToken(user.id, refreshToken, refreshTokenExpiry);

      // Set tokens in HTTP-only cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect based on onboarding status
      if (!user.hasCompletedOnboarding) {
        return res.redirect('/onboarding');
      }

      return res.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.redirect('/login?error=callback_failed');
    }
  }
);

/**
 * Link Google account to existing user
 * POST /api/auth/link-google
 * Requires existing authentication
 */
router.post('/link-google', async (req: Request, res: Response) => {
  try {
    // This would need to be implemented with proper session handling
    // For now, we'll return a placeholder
    res.status(501).json({
      message: 'Link Google account feature coming soon',
    });
  } catch (error) {
    console.error('Link Google account error:', error);
    res.status(500).json({ error: 'Failed to link Google account' });
  }
});

export default router;
