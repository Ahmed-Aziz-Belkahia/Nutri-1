import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

// Configure Nodemailer transporter for Hostinger SMTP with connection pooling
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: 'support@nutriai.pl',
    pass: '7|Pwm5qY?U'
  },
  // Connection pooling to avoid "too many AUTH commands"
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  rateDelta: 2000, // 2 seconds between emails
  rateLimit: 5, // max 5 emails per rateDelta
  // Connection settings
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 60000
});

// Track if transporter is verified
let transporterVerified = false;

// Verify transporter configuration (only once at startup)
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Configuration Error:', error);
    transporterVerified = false;
  } else {
    console.log('✅ SMTP Server ready to send emails (pooled connection)');
    transporterVerified = true;
  }
});

// Email queue to prevent rate limiting
interface EmailJob {
  to: string;
  subject: string;
  html: string;
  retries: number;
  resolve: (value: void) => void;
  reject: (reason: any) => void;
}

const emailQueue: EmailJob[] = [];
let isProcessingQueue = false;

// Process email queue with delays between emails
const processEmailQueue = async () => {
  if (isProcessingQueue || emailQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (emailQueue.length > 0) {
    const job = emailQueue.shift()!;
    
    try {
      // Generate plain text version from HTML for better deliverability
      const plainText = job.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const info = await transporter.sendMail({
        from: '"NutriAI" <support@nutriai.pl>',
        to: job.to,
        subject: job.subject,
        html: job.html,
        text: plainText, // Plain text version for spam filters
        headers: {
          'X-Priority': '3', // Normal priority
          'X-Mailer': 'NutriAI Mailer',
          'List-Unsubscribe': '<mailto:unsubscribe@nutriai.pl>',
          'Precedence': 'bulk'
        },
        replyTo: 'support@nutriai.pl'
      });
      
      console.log(`✅ Email sent to ${job.to}: ${info.messageId}`);
      job.resolve();
    } catch (error: any) {
      console.error(`❌ Error sending email to ${job.to}:`, error.message);
      
      // Check if it's a rate limit error - retry with backoff
      if (error.message?.includes('Ratelimit') || error.message?.includes('too many AUTH') || error.responseCode === 450 || error.responseCode === 451) {
        if (job.retries < 3) {
          console.log(`🔄 Retrying email to ${job.to} (attempt ${job.retries + 1}/3) after delay...`);
          job.retries++;
          emailQueue.push(job); // Re-add to queue
          // Wait longer before next attempt (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 5000 * Math.pow(2, job.retries)));
        } else {
          console.error(`❌ Max retries reached for email to ${job.to}`);
          job.reject(new Error('Failed to send email after max retries'));
        }
      } else {
        job.reject(error);
      }
    }
    
    // Delay between emails to prevent rate limiting (1 second)
    if (emailQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  isProcessingQueue = false;
};

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
 * Sends an email using Nodemailer with queue and retry logic
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
  return new Promise((resolve, reject) => {
    emailQueue.push({
      to,
      subject,
      html,
      retries: 0,
      resolve,
      reject
    });
    
    // Start processing queue if not already running
    processEmailQueue();
  });
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
    // Professional HTML email template optimized for deliverability
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Email Verification - NutriAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0CC5BA 0%, #26A8FF 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Email Verification</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Welcome to NutriAI!</p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">Thank you for signing up. To complete your registration and start your nutrition journey, please use the verification code below:</p>
              
              <!-- Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 20px; background-color: #f8fafa; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <p style="margin: 0 0 12px; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                    <p style="margin: 0; font-size: 36px; font-weight: 700; color: #0CC5BA; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace;">${code}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">This code will expire in 15 minutes for security reasons.</p>
              <p style="margin: 20px 0 0; color: #888888; font-size: 13px; line-height: 1.6;">If you did not create an account with NutriAI, you can safely ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #eeeeee;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; color: #666666; font-size: 13px;">Need help? Contact us at <a href="mailto:support@nutriai.pl" style="color: #0CC5BA; text-decoration: none;">support@nutriai.pl</a></p>
                    <p style="margin: 0; color: #999999; font-size: 11px;">NutriAI - Nutrition Tracking Application</p>
                    <p style="margin: 8px 0 0; color: #bbbbbb; font-size: 10px;">nutriai.online</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    
    await sendEmail(
      email,
      'Your NutriAI Verification Code',
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
    // Professional HTML email template optimized for deliverability
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Password Reset - NutriAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0CC5BA 0%, #26A8FF 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Password Reset</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">Hello!</p>
              <p style="margin: 0 0 30px; color: #666666; font-size: 15px; line-height: 1.6;">You requested to reset your password for your NutriAI account. Use the verification code below to complete the process:</p>
              
              <!-- Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 20px; background-color: #f8fafa; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <p style="margin: 0 0 12px; color: #888888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Reset Code</p>
                    <p style="margin: 0; font-size: 36px; font-weight: 700; color: #0CC5BA; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace;">${code}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">This code will expire in 15 minutes for security reasons.</p>
              <p style="margin: 20px 0 0; color: #888888; font-size: 13px; line-height: 1.6;">If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; border-top: 1px solid #eeeeee;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; color: #666666; font-size: 13px;">Need help? Contact us at <a href="mailto:support@nutriai.pl" style="color: #0CC5BA; text-decoration: none;">support@nutriai.pl</a></p>
                    <p style="margin: 0; color: #999999; font-size: 11px;">NutriAI - Nutrition Tracking Application</p>
                    <p style="margin: 8px 0 0; color: #bbbbbb; font-size: 10px;">nutriai.online</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    
    await sendEmail(
      email,
      'Your NutriAI Password Reset Code',
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