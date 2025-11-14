import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

// Configure Nodemailer transporter for Hostinger SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: 'support@nutriai.pl',
    pass: '7|Pwm5qY?U'
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Configuration Error:', error);
  } else {
    console.log('✅ SMTP Server ready to send emails');
  }
});

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
 * Sends an email using Nodemailer
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content of the email
 * @returns Promise that resolves when email is sent
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: '"NutriAI Support" <support@nutriai.pl>',
      to,
      subject,
      html
    });
    
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Failed to send email');
  }
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
 * Sends an email verification code to a user (6-digit code)
 * @param email User's email address
 * @param code 6-digit verification code
 */
export const sendVerificationCodeEmail = async (
  email: string,
  code: string
): Promise<void> => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #0CC5BA 0%, #26A8FF 100%);
            padding: 40px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 18px;
            color: #1f1f1e;
            margin-bottom: 20px;
          }
          .message {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
          }
          .code-container {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px dashed #0CC5BA;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .code-label {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .code {
            font-size: 48px;
            font-weight: 700;
            color: #0CC5BA;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            color: #856404;
            font-size: 14px;
          }
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .footer-link {
            color: #0CC5BA;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Verify Your Email</h1>
          </div>
          <div class="content">
            <div class="greeting">Welcome to NutriAI!</div>
            <div class="message">
              Thank you for signing up. To complete your registration and start your nutrition journey, 
              please verify your email address using the code below:
            </div>
            <div class="code-container">
              <div class="code-label">Your Verification Code</div>
              <div class="code">${code}</div>
            </div>
            <div class="message">
              This code will expire in <strong>15 minutes</strong> for security reasons.
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong> If you didn't create an account with NutriAI, 
              please ignore this email.
            </div>
          </div>
          <div class="footer">
            <p>Need help? Contact us at <a href="mailto:support@nutriai.pl" class="footer-link">support@nutriai.pl</a></p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              © 2025 NutriAI. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail(
      email,
      'Verify Your Email - NutriAI',
      html
    );
  } catch (error) {
    console.error('Error sending verification code email:', error);
    // Log but don't throw to avoid breaking registration
    console.log(`[Email Service] Verification code email could not be sent to ${email}, but continuing registration`);
  }
};

/**
 * Sends a password reset email to a user with a verification code
 * @param email User's email address
 * @param code 6-digit verification code
 */
export const sendPasswordResetEmail = async (
  email: string,
  code: string
): Promise<void> => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #0CC5BA 0%, #26A8FF 100%);
            padding: 40px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 18px;
            color: #1f1f1e;
            margin-bottom: 20px;
          }
          .message {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
          }
          .code-container {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px dashed #0CC5BA;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .code-label {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .code {
            font-size: 48px;
            font-weight: 700;
            color: #0CC5BA;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            color: #856404;
            font-size: 14px;
          }
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .footer-link {
            color: #0CC5BA;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <div class="greeting">Hello!</div>
            <div class="message">
              You requested to reset your password for your NutriAI account. 
              Use the verification code below to complete the process:
            </div>
            <div class="code-container">
              <div class="code-label">Your Verification Code</div>
              <div class="code">${code}</div>
            </div>
            <div class="message">
              This code will expire in <strong>15 minutes</strong> for security reasons.
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong> If you didn't request a password reset, 
              please ignore this email and your password will remain unchanged.
            </div>
          </div>
          <div class="footer">
            <p>Need help? Contact us at <a href="mailto:support@nutriai.pl" class="footer-link">support@nutriai.pl</a></p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              © 2025 NutriAI. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await sendEmail(
      email,
      'Reset Your Password - NutriAI',
      html
    );
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error; // Throw to let caller know email failed
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