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
 * Generate a 6-digit verification code
 * @returns A 6-digit numeric string
 */
export const generate6DigitCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate an email verification code for a user (6-digit code)
 * @param userId User ID
 * @returns The generated 6-digit verification code
 */
export const generateEmailVerificationCode = async (userId: number): Promise<string> => {
  try {
    const code = generate6DigitCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code expires in 15 minutes
    
    // Update user with verification code
    await db.update(users)
      .set({
        verificationCode: code,
        verificationCodeExpiresAt: expiresAt
      })
      .where(eq(users.id, userId));
    
    return code;
  } catch (error) {
    console.error('Error generating email verification code:', error);
    throw new Error('Failed to generate email verification code');
  }
};

/**
 * Verify an email verification code (6-digit code)
 * @param email User's email address
 * @param code The 6-digit verification code
 * @returns Object with success status, message, and userId if successful
 */
export const verifyEmailVerificationCode = async (email: string, code: string): Promise<{ success: boolean; message: string; userId?: number }> => {
  try {
    const now = new Date();
    
    // Find user with matching email and code
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    // Check if user exists
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    
    // Check if verification code matches
    if (user.verificationCode !== code) {
      return { success: false, message: 'Invalid verification code' };
    }
    
    // Check if code has expired
    if (!user.verificationCodeExpiresAt) {
      return { success: false, message: 'No verification code found' };
    }
    
    if (user.verificationCodeExpiresAt < now) {
      return { success: false, message: 'Verification code has expired. Please request a new one.' };
    }
    
    // Mark email as verified and clear verification code
    await db.update(users)
      .set({
        isEmailVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null
      })
      .where(eq(users.id, user.id));
    
    return {
      success: true,
      message: 'Email verified successfully',
      userId: user.id
    };
  } catch (error) {
    console.error('Error verifying email verification code:', error);
    return { success: false, message: 'Failed to verify email verification code' };
  }
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
 * Create a password reset token for a user (6-digit code)
 * @param userId User ID
 * @returns The generated 6-digit reset code
 */
export const createPasswordResetToken = async (userId: number): Promise<string> => {
  try {
    const code = generate6DigitCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code expires in 15 minutes
    
    // Update user with reset code
    await db.update(users)
      .set({
        resetToken: code,
        resetTokenExpiresAt: expiresAt
      })
      .where(eq(users.id, userId));
    
    return code;
  } catch (error) {
    console.error('Error generating password reset code:', error);
    throw new Error('Failed to generate password reset code');
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
 * Generate a password reset token for a user (6-digit code)
 * @param userId User ID
 * @returns The generated 6-digit reset code
 */
export const generatePasswordResetToken = async (userId: number): Promise<string> => {
  try {
    const code = generate6DigitCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code expires in 15 minutes
    
    // Update user with reset code
    await db.update(users)
      .set({
        resetToken: code,
        resetTokenExpiresAt: expiresAt
      })
      .where(eq(users.id, userId));
    
    return code;
  } catch (error) {
    console.error('Error generating password reset code:', error);
    throw new Error('Failed to generate password reset code');
  }
};

/**
 * Verify a password reset token (6-digit code)
 * @param code The 6-digit reset code
 * @returns Object with success status, message, and userId if successful
 */
export const verifyPasswordResetToken = async (code: string): Promise<{ success: boolean; message: string; userId?: number }> => {
  try {
    const now = new Date();
    
    // Find user with matching code
    const user = await db.query.users.findFirst({
      where: eq(users.resetToken, code)
    });
    
    // Check if code exists and is not expired
    if (!user) {
      return { success: false, message: 'Invalid verification code' };
    }
    
    if (!user.resetTokenExpiresAt) {
      return { success: false, message: 'Verification code has no expiration date' };
    }
    
    if (user.resetTokenExpiresAt < now) {
      return { success: false, message: 'Verification code has expired. Please request a new one.' };
    }
    
    return {
      success: true,
      message: 'Code is valid',
      userId: user.id
    };
  } catch (error) {
    console.error('Error verifying password reset code:', error);
    return { success: false, message: 'Failed to verify password reset code' };
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