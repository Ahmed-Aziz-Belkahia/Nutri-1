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
router.get('/google', (req: Request, res: Response, next) => {
  // Check if request is from mobile app
  const platform = req.query.platform as string;
  const userAgent = req.get('User-Agent') || '';
  const isMobileApp = platform === 'mobile' || /nutriai-app/i.test(userAgent);
  
  // For mobile apps, return the OAuth URL so they can open it in a secure browser
  // Google blocks OAuth in embedded webviews (Error 403: disallowed_useragent)
  if (isMobileApp && req.query.return_url === 'true') {
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const state = encodeURIComponent(JSON.stringify({ platform: 'mobile' }));
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('profile email openid')}` +
      `&state=${state}` +
      `&access_type=online`;
    
    return res.json({
      success: true,
      authUrl: googleAuthUrl,
      message: 'Open this URL in Chrome Custom Tabs (Android) or SFSafariViewController (iOS)',
      instructions: 'The mobile app should open this URL in a secure browser component, not a webview'
    });
  }
  
  // Pass platform info through state parameter
  const authenticateOptions: any = {
    scope: ['profile', 'email'],
    session: false,
  };
  
  if (isMobileApp) {
    authenticateOptions.state = JSON.stringify({ platform: 'mobile' });
  }
  
  passport.authenticate('google', authenticateOptions)(req, res, next);
});

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

      // Detect if request came from mobile app
      const userAgent = req.get('User-Agent') || '';
      let isMobileApp = /nutriai-app/i.test(userAgent) || req.query.platform === 'mobile';
      
      // Also check state parameter
      if (req.query.state) {
        try {
          const state = JSON.parse(req.query.state as string);
          if (state.platform === 'mobile') {
            isMobileApp = true;
          }
        } catch (e) {
          // Ignore invalid state
        }
      }
      
      if (isMobileApp) {
        // For mobile apps, use custom deep link
        const deepLink = user.hasCompletedOnboarding 
          ? 'nutriai://auth/success?onboarding=false'
          : 'nutriai://auth/success?onboarding=true';
        
        // Also include tokens in the deep link (will be picked up by the app)
        const linkWithTokens = `${deepLink}&access=${encodeURIComponent(accessToken)}&refresh=${encodeURIComponent(refreshToken)}`;
        
        return res.redirect(linkWithTokens);
      }

      // For web browsers
      // Check if this was opened in a popup
      const isPopup = req.query.popup === 'true';
      
      if (isPopup) {
        // Send HTML that closes the popup and notifies parent window
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #0CC5BA 0%, #0891b2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
              }
              .checkmark {
                font-size: 48px;
                margin-bottom: 1rem;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="checkmark">✓</div>
              <h2>Authentication Successful!</h2>
              <p>This window will close automatically...</p>
            </div>
            <script>
              // Notify parent window and close
              if (window.opener) {
                window.opener.postMessage({ type: 'AUTH_SUCCESS' }, '*');
              }
              setTimeout(() => {
                window.close();
              }, 1500);
            </script>
          </body>
          </html>
        `);
      }
      
      // Normal redirect flow
      if (!user.hasCompletedOnboarding) {
        return res.redirect('/onboarding');
      }

      return res.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth callback error:', error);
      
      // Check if mobile app
      const userAgent = req.get('User-Agent') || '';
      const isMobileApp = /nutriai-app/i.test(userAgent) || req.query.platform === 'mobile';
      
      if (isMobileApp) {
        return res.redirect('nutriai://auth/error?message=callback_failed');
      }
      
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
