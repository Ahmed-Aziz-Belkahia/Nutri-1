import crypto from 'crypto';
import { db } from '../../db';
import { users, passwordResetTokens } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate a random token
 * @returns A random token string
 */
export const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a verification token for a user
 * Note: Since we don't have verification columns in the database,
 * we'll use the passwordResetTokens table with a different type
 * @param userId User ID
 * @returns The generated verification token
 */
export const generateVerificationToken = async (userId: number): Promise<string> => {
  try {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours
    
    // Instead of updating user, create a new token in password_reset_tokens table
    // but with a special note that it's for email verification
    await db.insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt,
        createdAt: new Date()
      });
    
    return token;
  } catch (error) {
    console.error('Error generating verification token:', error);
    throw new Error('Failed to generate verification token');
  }
};

/**
 * Create an email verification token for a user
 * @param userId User ID
 * @returns The generated verification token
 */
export const createEmailVerificationToken = async (userId: number): Promise<string> => {
  return generateVerificationToken(userId);
};

/**
 * Create a password reset token for a user
 * @param userId User ID
 * @returns The generated reset token
 */
export const createPasswordResetToken = async (userId: number): Promise<string> => {
  try {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
    
    // Update user with reset token
    await db.update(users)
      .set({
        resetToken: token,
        resetTokenExpiresAt: expiresAt
      })
      .where(eq(users.id, userId));
    
    return token;
  } catch (error) {
    console.error('Error generating password reset token:', error);
    throw new Error('Failed to generate password reset token');
  }
};

/**
 * Verify a user's email verification token
 * This is adapted to use the passwordResetTokens table since verification columns don't exist
 * @param token The verification token
 * @returns Object with success status, message, and userId if successful
 */
export const verifyEmailToken = async (token: string): Promise<{ success: boolean; message: string; userId?: number }> => {
  try {
    const now = new Date();
    
    // Find token in passwordResetTokens table
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: eq(passwordResetTokens.token, token),
      with: {
        user: true
      }
    });
    
    // Check if token exists and is not expired or used
    if (!resetToken) {
      return { success: false, message: 'Invalid verification token' };
    }
    
    if (resetToken.expiresAt < now) {
      return { success: false, message: 'Verification token has expired' };
    }
    
    if (resetToken.usedAt) {
      return { success: false, message: 'Verification token has already been used' };
    }
    
    // Mark token as used
    await db.update(passwordResetTokens)
      .set({
        usedAt: new Date()
      })
      .where(eq(passwordResetTokens.id, resetToken.id));
    
    return { 
      success: true, 
      message: 'Email verified successfully',
      userId: resetToken.userId
    };
  } catch (error) {
    console.error('Error verifying email token:', error);
    return { success: false, message: 'Failed to verify email token' };
  }
};

/**
 * Generate a password reset token for a user
 * @param userId User ID
 * @returns The generated reset token
 */
export const generatePasswordResetToken = async (userId: number): Promise<string> => {
  try {
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
    
    // Update user with reset token
    await db.update(users)
      .set({
        resetToken: token,
        resetTokenExpiresAt: expiresAt
      })
      .where(eq(users.id, userId));
    
    return token;
  } catch (error) {
    console.error('Error generating password reset token:', error);
    throw new Error('Failed to generate password reset token');
  }
};

/**
 * Verify a password reset token
 * @param token The reset token
 * @returns Object with success status, message, and userId if successful
 */
export const verifyPasswordResetToken = async (token: string): Promise<{ success: boolean; message: string; userId?: number }> => {
  try {
    const now = new Date();
    
    // Find user with matching token
    const user = await db.query.users.findFirst({
      where: eq(users.resetToken, token)
    });
    
    // Check if token exists and is not expired
    if (!user) {
      return { success: false, message: 'Invalid reset token' };
    }
    
    if (!user.resetTokenExpiresAt) {
      return { success: false, message: 'Reset token has no expiration date' };
    }
    
    if (user.resetTokenExpiresAt < now) {
      return { success: false, message: 'Reset token has expired' };
    }
    
    return {
      success: true,
      message: 'Token is valid',
      userId: user.id
    };
  } catch (error) {
    console.error('Error verifying password reset token:', error);
    return { success: false, message: 'Failed to verify password reset token' };
  }
};

/**
 * Clear a user's password reset token after it has been used
 * @param userId User ID
 */
export const clearPasswordResetToken = async (userId: number): Promise<void> => {
  try {
    await db.update(users)
      .set({
        resetToken: null,
        resetTokenExpiresAt: null
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('Error clearing password reset token:', error);
    throw new Error('Failed to clear password reset token');
  }
};