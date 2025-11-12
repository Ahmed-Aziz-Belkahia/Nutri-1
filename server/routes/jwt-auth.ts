import { Router, Response } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from '@db';
import { users, userNutritionPreferences, refreshTokens, userTokenLimits } from '@db/schema';
import { eq } from 'drizzle-orm';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  verifyRefreshTokenInDB,
  revokeRefreshToken,
  revokeAllUserTokens,
  getTokenExpiryDates,
  requireAuth,
  type AuthRequest
} from '../utils/jwt';
import {
  generateVerificationToken as createEmailVerificationToken,
  verifyEmailToken,
  generatePasswordResetToken as createPasswordResetToken,
  verifyPasswordResetToken,
  clearPasswordResetToken
} from '../utils/token';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
} from '../services/email';

const router = Router();
const scryptAsync = promisify(scrypt);

// Password hashing utilities
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    try {
      const [hashedPassword, salt] = storedPassword.split(".");
      if (!hashedPassword || !salt) {
        console.warn('Invalid password format in database');
        return false;
      }
      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const suppliedPasswordBuf = (await scryptAsync(
        suppliedPassword,
        salt,
        64
      )) as Buffer;
      
      if (hashedPasswordBuf.length !== suppliedPasswordBuf.length) {
        console.warn('Password hash length mismatch');
        return false;
      }
      
      return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  },
};

/**
 * POST /api/auth/register
 * Register a new user with JWT authentication
 */
router.post('/register', async (req, res: Response) => {
  try {
    console.log('[JWT Auth] Registration request:', req.body.email);
    const { email, password, profile } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate username from email
    const username = email.split('@')[0];
    
    // Create user
    const userData = {
      username,
      email,
      password: await crypto.hash(password),
      hasCompletedOnboarding: Boolean(profile),
      lastActivityDate: new Date().toISOString().split('T')[0] as any,
      profileImage: null,
      preferred_language: 'en',
      currentStreak: 0,
      longestStreak: 0,
      experiencePoints: 0,
      level: 1,
      isAdmin: false
    };
    
    const [newUser] = await db
      .insert(users)
      .values(userData)
      .returning();

    console.log('[JWT Auth] User created:', newUser.id);

    // Create nutrition preferences if provided
    if (profile && newUser) {
      try {
        const nutritionPreferencesData = {
          userId: newUser.id,
          currentWeight: Number(profile.currentWeight),
          goalWeight: Number(profile.goalWeight),
          height: Number(profile.height || 170),
          weightGoal: profile.weightGoal,
          activityLevel: profile.activityLevel,
          caloriesGoal: Number(profile.calorieGoal),
          proteinGoal: Number(profile.proteinGoal),
          carbsGoal: Number(profile.carbsGoal),
          fatGoal: Number(profile.fatGoal),
          updatedAt: new Date(),
          dietaryRestrictions: profile.dietaryRestrictions || [],
          allergies: profile.allergies || []
        };

        await db
          .insert(userNutritionPreferences)
          .values(nutritionPreferencesData);

        console.log('[JWT Auth] Nutrition preferences created');
      } catch (error) {
        console.error('[JWT Auth] Error creating nutrition preferences:', error);
      }
    }

    // Initialize user token limits (free tier by default)
    try {
      await db.insert(userTokenLimits).values({
        userId: newUser.id,
        tier: 'free',
        dailyTokenLimit: 10000,
        monthlyTokenLimit: 200000,
        dailyUsed: 0,
        monthlyUsed: 0
      });
      console.log('[JWT Auth] Token limits initialized for user');
    } catch (error) {
      console.error('[JWT Auth] Error creating token limits:', error);
    }

    // Generate verification token and send email
    try {
      const verificationToken = await createEmailVerificationToken(newUser.id);
      await sendVerificationEmail(email, verificationToken);
      await sendWelcomeEmail(email, profile?.name || null);
      console.log('[JWT Auth] Verification and welcome emails sent');
    } catch (emailError) {
      console.error('[JWT Auth] Error sending emails:', emailError);
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(newUser.id, newUser.email);
    const refreshToken = generateRefreshToken(newUser.id, newUser.email);

    // Store refresh token in database
    const { refreshTokenExpiry } = getTokenExpiryDates();
    await storeRefreshToken(newUser.id, refreshToken, refreshTokenExpiry);

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

    console.log('[JWT Auth] Registration successful for:', email);

    res.status(201).json({
      ok: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        email: newUser.email,
        hasCompletedOnboarding: newUser.hasCompletedOnboarding
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('[JWT Auth] Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with JWT authentication
 */
router.post('/login', async (req, res: Response) => {
  try {
    console.log('[JWT Auth] Login request:', req.body.email);
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isMatch = await crypto.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);

    // Store refresh token in database
    const { refreshTokenExpiry } = getTokenExpiryDates();
    await storeRefreshToken(user.id, refreshToken, refreshTokenExpiry);

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

    console.log('[JWT Auth] Login successful for:', email);

    res.json({
      ok: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        preferredLanguage: user.preferred_language,
        profileImage: user.profileImage,
        isAdmin: user.isAdmin
      },
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('[JWT Auth] Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res: Response) => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify token exists in database and is not revoked
    const isValid = await verifyRefreshTokenInDB(refreshToken);
    if (!isValid) {
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId, decoded.email);

    // Set new access token in cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    console.log('[JWT Auth] Token refreshed for user:', decoded.userId);

    res.json({
      ok: true,
      accessToken: newAccessToken
    });

  } catch (error) {
    console.error('[JWT Auth] Refresh token error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and revoke refresh token
 */
router.post('/logout', async (req, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Revoke refresh token
      await revokeRefreshToken(refreshToken);
      console.log('[JWT Auth] Refresh token revoked');
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    console.log('[JWT Auth] Logout successful');

    res.json({
      ok: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('[JWT Auth] Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices (revoke all refresh tokens)
 */
router.post('/logout-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Revoke all user refresh tokens
    await revokeAllUserTokens(req.user.id);

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    console.log('[JWT Auth] All devices logged out for user:', req.user.id);

    res.json({
      ok: true,
      message: 'Logged out from all devices'
    });

  } catch (error) {
    console.error('[JWT Auth] Logout all error:', error);
    res.status(500).json({
      error: 'Logout all failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user (requires authentication)
 */
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch full user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      preferredLanguage: user.preferred_language,
      profileImage: user.profileImage,
      isAdmin: user.isAdmin,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      experiencePoints: user.experiencePoints,
      level: user.level
    });

  } catch (error) {
    console.error('[JWT Auth] Get current user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/verify-token
 * Verify if access token is valid
 */
router.post('/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  // If we reach here, the token is valid (requireAuth middleware passed)
  res.json({
    ok: true,
    valid: true,
    user: req.user
  });
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req, res: Response) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // For security, always return success even if email doesn't exist
    if (!user) {
      return res.json({
        ok: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = await createPasswordResetToken(user.id);

    // Send password reset email
    await sendPasswordResetEmail(email, resetToken);

    console.log('[JWT Auth] Password reset email sent to:', email);

    res.json({
      ok: true,
      message: 'If an account with that email exists, a verification code has been sent.'
    });

  } catch (error) {
    console.error('[JWT Auth] Forgot password error:', error);
    res.status(500).json({
      error: 'Password reset request failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/verify-reset-code
 * Verify reset code without changing password
 */
router.post('/verify-reset-code', async (req, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    // Verify reset code
    const result = await verifyPasswordResetToken(code);

    if (!result.success) {
      return res.status(400).json({ error: result.message || 'Invalid or expired code' });
    }

    console.log('[JWT Auth] Code verification successful');

    res.json({
      ok: true,
      message: 'Code is valid'
    });

  } catch (error) {
    console.error('[JWT Auth] Verify code error:', error);
    res.status(500).json({
      error: 'Code verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with verification code
 */
router.post('/reset-password', async (req, res: Response) => {
  try {
    const { code, newPassword } = req.body;

    if (!code || !newPassword) {
      return res.status(400).json({ error: 'Verification code and new password are required' });
    }

    // Verify reset code
    const result = await verifyPasswordResetToken(code);

    if (!result.success || !result.userId) {
      return res.status(400).json({ error: result.message || 'Invalid or expired code' });
    }

    // Hash new password
    const hashedPassword = await crypto.hash(newPassword);

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, result.userId));

    // Clear reset token
    await clearPasswordResetToken(result.userId);

    // Revoke all refresh tokens for security
    await revokeAllUserTokens(result.userId);

    console.log('[JWT Auth] Password reset successful for user:', result.userId);

    res.json({
      ok: true,
      message: 'Password has been successfully reset. Please login with your new password.'
    });

  } catch (error) {
    console.error('[JWT Auth] Reset password error:', error);
    res.status(500).json({
      error: 'Password reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/auth/verify-email
 * Verify email address
 */
router.get('/verify-email', async (req, res: Response) => {
  try {
    const { token } = req.query as { token: string };

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const result = await verifyEmailToken(token);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    console.log('[JWT Auth] Email verified for user:', result.userId);

    res.json({
      ok: true,
      message: result.message
    });

  } catch (error) {
    console.error('[JWT Auth] Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
