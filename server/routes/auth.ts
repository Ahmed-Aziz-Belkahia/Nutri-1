import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { 
  generateVerificationToken, 
  verifyEmailToken, 
  generatePasswordResetToken, 
  verifyPasswordResetToken, 
  clearPasswordResetToken 
} from '../utils/token';
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail 
} from '../services/email';

const router = Router();

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if email is already in use
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with schema-matching fields
    const userData = {
        email,
        password: hashedPassword,
        // Initialize user fields with default values
        hasCompletedOnboarding: false,
  lastActivityDate: new Date().toISOString().split('T')[0] as any,
        profileImage: null,
        preferred_language: 'en', // this one actually uses snake_case in the schema
        currentStreak: 0,
        longestStreak: 0,
        experiencePoints: 0,
        level: 1
    };
    
    const [newUser] = await db.insert(users)
      .values(userData)
      .returning({ id: users.id });
    
    // Generate verification token
    const token = await generateVerificationToken(newUser.id);
    
    // Send verification email
    await sendVerificationEmail(email, token);
    
    return res.status(201).json({ 
      message: 'Registration successful. Please check your email to verify your account.',
      userId: newUser.id
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Verify email
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query as { token: string };
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }
    
    const result = await verifyEmailToken(token);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    // Send welcome email after successful verification
    const user = await db.query.users.findFirst({
      where: eq(users.id, result.userId as number)
    });
    
    if (user) {
      await sendWelcomeEmail(user.email);
    }
    
    return res.status(200).json({ message: result.message });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ error: 'Email verification failed. Please try again.' });
  }
});

// Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }
    
    // Generate reset token
    const token = await generatePasswordResetToken(user.id);
    
    // Send password reset email
    await sendPasswordResetEmail(email, token);
    
    return res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Password reset request failed. Please try again.' });
  }
});

// Verify password reset token
router.get('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token } = req.query as { token: string };
    
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }
    
    const result = await verifyPasswordResetToken(token);
    
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    
    return res.status(200).json({ 
      message: 'Token is valid',
      token
    });
    
  } catch (error) {
    console.error('Reset token validation error:', error);
    return res.status(500).json({ error: 'Token validation failed. Please try again.' });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    // Verify token
    const result = await verifyPasswordResetToken(token);
    
    if (!result.success || !result.userId) {
      return res.status(400).json({ error: result.message });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, result.userId));
    
    // Clear reset token
    await clearPasswordResetToken(result.userId);
    
    return res.status(200).json({ message: 'Password has been successfully reset' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (!user) {
      // For security reasons, don't reveal if email exists or not
      return res.status(200).json({ 
        message: 'If an account with that email exists, a verification email has been sent.' 
      });
    }
    
    // Since we don't have an isVerified column, we'll just send the verification
    // email to all users who request it
    
    // Generate new verification token
    const token = await generateVerificationToken(user.id);
    
    // Send verification email
    await sendVerificationEmail(email, token);
    
    return res.status(200).json({ 
      message: 'Verification email has been sent. Please check your inbox.' 
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ error: 'Failed to resend verification email. Please try again.' });
  }
});

export default router;