import { Router, Response, Request, NextFunction } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import rateLimit from 'express-rate-limit';
import { db } from '@db';
import { users, userNutritionPreferences, refreshTokens, userTokenLimits, pendingRegistrations } from '@db/schema';
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
  clearPasswordResetToken,
  generateEmailVerificationCode,
  verifyEmailVerificationCode
} from '../utils/token';
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVerificationCodeEmail
} from '../services/email';

const router = Router();
const scryptAsync = promisify(scrypt);

// Helper to get client IP consistently
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
    return ips?.split(',')[0]?.trim() || 'unknown';
  }
  return req.socket?.remoteAddress || 'unknown';
};

// Rate limiters to prevent abuse
// Registration: 3 attempts per email per 15 minutes
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per window
  message: { error: 'Too many registration attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit by email + IP combo
    const email = req.body?.email?.toLowerCase() || 'unknown';
    return `register-${email}-${getClientIp(req)}`;
  },
  skip: (req: Request) => !req.body?.email // Skip if no email provided
});

// Verification code: 5 attempts per email per 15 minutes
const verifyCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many verification attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email?.toLowerCase() || 'unknown';
    return `verify-${email}-${getClientIp(req)}`;
  }
});

// Login: 10 attempts per IP per 15 minutes  
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `login-${getClientIp(req)}`,
});

// Password reset: 3 attempts per email per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per window
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email?.toLowerCase() || 'unknown';
    return `reset-${email}-${getClientIp(req)}`;
  }
});

// Resend code: 2 attempts per email per 5 minutes
const resendCodeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 2, // 2 attempts per window
  message: { error: 'Please wait before requesting another verification code.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email?.toLowerCase() || 'unknown';
    return `resend-${email}-${getClientIp(req)}`;
  }
});

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
router.post('/register', registerLimiter, async (req, res: Response) => {
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

    // Check if there's already a pending registration
    const [existingPending] = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, email))
      .limit(1);

    // Delete existing pending registration if found
    if (existingPending) {
      await db
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.email, email));
    }

    // Hash password
    const hashedPassword = await crypto.hash(password);

    // Generate 6-digit verification code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store pending registration
    await db.insert(pendingRegistrations).values({
      email,
      password: hashedPassword,
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
      profileData: profile ? JSON.stringify(profile) : null,
    });

    console.log('[JWT Auth] Pending registration created for:', email);

    // Send verification code email (but don't wait for it or block registration)
    sendVerificationCodeEmail(email, code).catch(error => {
      console.error('[JWT Auth] Failed to send verification email:', error);
    });

    console.log('[JWT Auth] Registration initiated for:', email);

    // Don't create the account yet - they need to verify email first
    res.status(201).json({
      ok: true,
      message: 'Please check your email for a verification code to complete registration.',
      requiresVerification: true
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
 * POST /api/auth/verify-email-code
 * Verify email with code and complete registration
 */
router.post('/verify-email-code', verifyCodeLimiter, async (req, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    // Find pending registration
    const [pending] = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, email))
      .limit(1);

    if (!pending) {
      return res.status(400).json({ error: 'No pending registration found for this email' });
    }

    // Check if code matches
    if (pending.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if code has expired
    if (new Date() > new Date(pending.verificationCodeExpiresAt)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Parse profile data
    const profile = pending.profileData as any;

    // Generate username from email
    const username = email.split('@')[0];

    // Create the actual user account
    const userData = {
      username,
      email,
      password: pending.password, // Already hashed
      hasCompletedOnboarding: Boolean(profile),
      lastActivityDate: new Date().toISOString().split('T')[0] as any,
      profileImage: null,
      preferred_language: 'en',
      currentStreak: 0,
      longestStreak: 0,
      experiencePoints: 0,
      level: 1,
      isAdmin: false,
      isEmailVerified: true // Mark as verified since they just verified
    };

    const [newUser] = await db
      .insert(users)
      .values(userData)
      .returning();

    console.log('[JWT Auth] User account created after verification:', newUser.id);

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

    // Delete the pending registration
    await db
      .delete(pendingRegistrations)
      .where(eq(pendingRegistrations.email, email));

    // Send welcome email
    sendWelcomeEmail(email, profile?.name || null).catch(error => {
      console.error('[JWT Auth] Failed to send welcome email:', error);
    });

    // Generate JWT tokens and log the user in
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
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000 // 365 days (1 year)
    });

    console.log('[JWT Auth] Email verified and account created:', email);

    res.json({
      ok: true,
      message: 'Email verified successfully. Your account has been created!',
      user: {
        id: newUser.id,
        email: newUser.email,
        hasCompletedOnboarding: newUser.hasCompletedOnboarding
      }
    });

  } catch (error) {
    console.error('[JWT Auth] Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/resend-verification-code
 * Resend verification code for pending registration
 */
router.post('/resend-verification-code', resendCodeLimiter, async (req, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find pending registration
    const [pending] = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, email))
      .limit(1);

    if (!pending) {
      // For security reasons, don't reveal if email exists or not
      return res.status(200).json({
        message: 'If a pending registration exists, a verification code has been sent.'
      });
    }

    // Generate new 6-digit verification code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Update pending registration with new code
    await db
      .update(pendingRegistrations)
      .set({
        verificationCode: code,
        verificationCodeExpiresAt: expiresAt
      })
      .where(eq(pendingRegistrations.email, email));

    // Send verification code email (but don't wait for it)
    sendVerificationCodeEmail(email, code).catch(error => {
      console.error('[JWT Auth] Failed to send verification email:', error);
    });

    return res.status(200).json({
      message: 'Verification code has been sent. Please check your inbox.'
    });

  } catch (error) {
    console.error('[JWT Auth] Resend verification code error:', error);
    res.status(500).json({
      error: 'Failed to resend verification code',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with JWT authentication
 */
router.post('/login', loginLimiter, async (req, res: Response) => {
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
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000 // 365 days (1 year)
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
      maxAge: 24 * 60 * 60 * 1000 // 1 day
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
router.post('/forgot-password', passwordResetLimiter, async (req, res: Response) => {
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
router.post('/verify-reset-code', verifyCodeLimiter, async (req, res: Response) => {
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
router.post('/reset-password', verifyCodeLimiter, async (req, res: Response) => {
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
      error: error instanceof Error ? error.message : 'Password reset failed'
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
      error: error instanceof Error ? error.message : 'Email verification failed'
    });
  }
});

export default router;
