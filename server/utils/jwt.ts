import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { users, refreshTokens } from '@db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';

// JWT Configuration
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'nutri-ai-access-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'nutri-ai-refresh-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Token payload interface
export interface TokenPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

// Extended Request interface with user
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    preferredLanguage?: string | null;
    preferred_language?: string | null;
    hasCompletedOnboarding?: boolean | null;
    has_completed_onboarding?: boolean | null;
    profileImage?: string | null;
    profile_image?: string | null;
    isAdmin?: boolean | null;
    is_admin?: boolean | null;
  };
}

/**
 * Generate access token (short-lived)
 */
export function generateAccessToken(userId: number, email: string): string {
  const payload: TokenPayload = {
    userId,
    email
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'nutri-ai',
    audience: 'nutri-ai-users'
  });
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(userId: number, email: string): string {
  const payload: TokenPayload = {
    userId,
    email
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'nutri-ai',
    audience: 'nutri-ai-users'
  });
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
      issuer: 'nutri-ai',
      audience: 'nutri-ai-users'
    }) as TokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('[JWT] Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('[JWT] Invalid access token');
    }
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'nutri-ai',
      audience: 'nutri-ai-users'
    }) as TokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('[JWT] Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('[JWT] Invalid refresh token');
    }
    return null;
  }
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(
  userId: number,
  token: string,
  expiresAt: Date
): Promise<void> {
  try {
    await db.insert(refreshTokens).values({
      userId,
      token,
      expiresAt: Math.floor(expiresAt.getTime() / 1000) // Convert to Unix timestamp (seconds)
      // createdAt is set by database default: strftime('%s', 'now')
    });
    console.log(`[JWT] Stored refresh token for user ${userId}`);
  } catch (error) {
    console.error('[JWT] Error storing refresh token:', error);
    throw new Error('Failed to store refresh token');
  }
}

/**
 * Verify refresh token exists in database and is valid
 */
export async function verifyRefreshTokenInDB(token: string): Promise<boolean> {
  try {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in Unix timestamp (seconds)
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, token),
          gt(refreshTokens.expiresAt, currentTime),
          eq(refreshTokens.isRevoked, false)
        )
      )
      .limit(1);

    return !!tokenRecord;
  } catch (error) {
    console.error('[JWT] Error verifying refresh token in DB:', error);
    return false;
  }
}

/**
 * Revoke refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.token, token));
    
    console.log('[JWT] Refresh token revoked');
  } catch (error) {
    console.error('[JWT] Error revoking refresh token:', error);
  }
}

/**
 * Revoke all user refresh tokens (for logout all devices)
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  try {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
    
    console.log(`[JWT] All refresh tokens revoked for user ${userId}`);
  } catch (error) {
    console.error('[JWT] Error revoking all user tokens:', error);
  }
}

/**
 * Clean up expired refresh tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in Unix timestamp (seconds)
    const result = await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, currentTime));
    
    console.log('[JWT] Cleaned up expired refresh tokens');
  } catch (error) {
    console.error('[JWT] Error cleaning up expired tokens:', error);
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Check for token in cookies or Authorization header
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch user from database and attach to request
    db.select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1)
      .then(([user]) => {
        if (!user) {
          res.status(401).json({ error: 'User not found' });
          return;
        }

        // Attach user to request
        req.user = {
          id: user.id,
          email: user.email,
          preferredLanguage: user.preferred_language,
          preferred_language: user.preferred_language,
          hasCompletedOnboarding: user.has_completed_onboarding,
          has_completed_onboarding: user.has_completed_onboarding,
          profileImage: user.profile_image,
          profile_image: user.profile_image,
          isAdmin: user.is_admin,
          is_admin: user.is_admin
        };

        next();
      })
      .catch((error) => {
        console.error('[JWT] Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
      });

  } catch (error) {
    console.error('[JWT] Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Check for token in cookies or Authorization header
    let token = req.cookies?.accessToken;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      // No token, continue without user
      next();
      return;
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      // Invalid token, continue without user
      next();
      return;
    }

    // Fetch user from database and attach to request
    db.select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1)
      .then(([user]) => {
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            preferredLanguage: user.preferred_language,
            preferred_language: user.preferred_language,
            hasCompletedOnboarding: user.has_completed_onboarding,
            has_completed_onboarding: user.has_completed_onboarding,
            profileImage: user.profile_image,
            profile_image: user.profile_image,
            isAdmin: user.is_admin,
            is_admin: user.is_admin
          };
        }
        next();
      })
      .catch((error) => {
        console.error('[JWT] Error fetching user in optional auth:', error);
        next();
      });

  } catch (error) {
    console.error('[JWT] Optional auth middleware error:', error);
    next();
  }
}

/**
 * Calculate token expiry dates
 */
export function getTokenExpiryDates() {
  const now = new Date();
  
  return {
    accessTokenExpiry: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes
    refreshTokenExpiry: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };
}
