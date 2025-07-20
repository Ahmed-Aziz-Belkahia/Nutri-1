import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

// Load environment variables
dotenv.config();

// Configure SendGrid API key if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('WARNING: SENDGRID_API_KEY is not set. Email functionality will be disabled.');
}

/**
 * Reads an HTML template file and compiles it with Handlebars
 * @param templatePath Path to the HTML template file
 * @param context Object containing values to be used in the template
 * @returns Compiled HTML string
 */
const compileTemplate = (templatePath: string, context: object): string => {
  try {
    const templatesDir = path.resolve('./server/templates/emails');
    const templateFile = path.join(templatesDir, templatePath);
    const template = fs.readFileSync(templateFile, 'utf8');
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(context);
  } catch (error) {
    console.error('Error compiling email template:', error);
    throw new Error('Failed to compile email template');
  }
};

/**
 * Mock email service - no actual emails are sent
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content of the email
 * @returns Promise that resolves immediately
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  // Simply log what would have been sent and return success
  console.log(`[Email Service] MOCK EMAIL to: ${to}, subject: "${subject}"`);
  // No need to actually send emails - this is intentionally disabled
  return Promise.resolve();
};

/**
 * Sends a verification email to a user
 * @param email User's email address
 * @param token Verification token
 */
export const sendVerificationEmail = async (
  email: string,
  token: string
): Promise<void> => {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verificationLink = `${appUrl}/verify-email?token=${token}`;
    
    // If template file doesn't exist or there's an error, use a simple HTML string
    let html = '';
    try {
      html = compileTemplate('verification.html', { verificationLink });
    } catch (err) {
      console.log('Using fallback verification email template');
      html = `
        <h1>Verify Your Email Address</h1>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
      `;
    }
    
    await sendEmail(
      email,
      'Verify Your Email Address - NutriAI',
      html
    );
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Log but don't throw to avoid breaking registration
    console.log(`[Email Service] Verification email could not be sent to ${email}, but continuing registration`);
  }
};

/**
 * Sends a password reset email to a user
 * @param email User's email address
 * @param token Password reset token
 */
export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<void> => {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;
    
    // If template file doesn't exist or there's an error, use a simple HTML string
    let html = '';
    try {
      html = compileTemplate('password-reset.html', { resetLink });
    } catch (err) {
      console.log('Using fallback password reset email template');
      html = `
        <h1>Reset Your Password</h1>
        <p>Please click the link below to reset your password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
      `;
    }
    
    await sendEmail(
      email,
      'Reset Your Password - NutriAI',
      html
    );
  } catch (error) {
    console.error('Error sending password reset email:', error);
    // Log but don't throw
    console.log(`[Email Service] Password reset email could not be sent to ${email}, but continuing`);
  }
};

/**
 * Sends a welcome email to a user
 * @param email User's email address
 * @param name Optional user name
 */
export const sendWelcomeEmail = async (email: string, name: string | null = null): Promise<void> => {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    // If template file doesn't exist or there's an error, use a simple HTML string
    let html = '';
    try {
      html = compileTemplate('welcome.html', { 
        appLink: appUrl,
        name: name || 'User' 
      });
    } catch (err) {
      console.log('Using fallback welcome email template');
      html = `
        <h1>Welcome to NutriAI!</h1>
        <p>Hi ${name || 'User'},</p>
        <p>Thank you for joining NutriAI. We're excited to help you on your nutrition journey!</p>
        <p><a href="${appUrl}">Click here to get started</a></p>
      `;
    }
    
    await sendEmail(
      email,
      'Welcome to NutriAI - Your Journey Begins!',
      html
    );
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Log but don't throw
    console.log(`[Email Service] Welcome email could not be sent to ${email}, but continuing`);
  }
};