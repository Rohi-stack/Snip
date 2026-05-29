import { Resend } from 'resend';
import { env } from '../config/index.js';

const EMAIL_FROM = env.emailFrom;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:4200';

// Initialize resend client if key is provided and validated
const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

// Premium dark/orange theme styled wrapper
function getEmailTemplate(title: string, bodyContent: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #0b0f17;
          color: #f3f4f6;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .card {
          background-color: #111827;
          border: 1px solid #1f2937;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .logo-container {
          margin-bottom: 28px;
          display: flex;
          align-items: center;
        }
        .logo {
          font-size: 26px;
          font-weight: 800;
          color: #ff6b00;
          text-decoration: none;
          letter-spacing: -0.5px;
        }
        .logo span {
          color: #ffffff;
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 18px;
        }
        .text {
          font-size: 15px;
          line-height: 1.6;
          color: #9ca3af;
          margin-bottom: 24px;
        }
        .highlight-box {
          background-color: #1c1917;
          border: 1px solid #78350f;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          margin-bottom: 24px;
        }
        .otp {
          font-family: "Courier New", Courier, monospace;
          font-size: 40px;
          font-weight: 800;
          color: #ff6b00;
          letter-spacing: 8px;
          margin: 0;
        }
        .btn-container {
          text-align: center;
          margin: 28px 0;
        }
        .btn {
          display: inline-block;
          background-color: #ff6b00;
          color: #ffffff !important;
          font-weight: 600;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.25);
          transition: background-color 0.2s;
        }
        .btn:hover {
          background-color: #e05e00;
        }
        .features-list {
          margin: 24px 0;
          padding-left: 20px;
        }
        .feature-item {
          color: #d1d5db;
          font-size: 15px;
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .feature-item strong {
          color: #ff6b00;
        }
        .footer {
          text-align: center;
          margin-top: 32px;
          font-size: 13px;
          color: #4b5563;
        }
        .footer-link {
          color: #ff6b00;
          text-decoration: none;
        }
        .url-fallback {
          font-size: 12px;
          color: #6b7280;
          word-break: break-all;
          background-color: #0b0f17;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #1f2937;
          margin-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo-container">
            <a href="${FRONTEND_URL}" class="logo">DashURL<span>.</span></a>
          </div>
          ${bodyContent}
        </div>
        <div class="footer">
          <p>This is a secure, automated transactional message from DashURL.</p>
          <p>&copy; ${new Date().getFullYear()} DashURL. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export const mailService = {
  /**
   * Sends a 6-digit OTP verification code email using Resend.
   */
  async sendVerificationOtpEmail(email: string, otp: string, expiresMinutes: number): Promise<void> {
    const subject = 'Verify your DashURL account';
    const title = 'Verify your email address';
    const bodyContent = `
      <h2 class="title">${title}</h2>
      <p class="text">Thank you for signing up for DashURL! To complete your registration and activate your account, please use the 6-digit verification code below:</p>
      <div class="highlight-box">
        <h1 class="otp">${otp}</h1>
      </div>
      <p class="text" style="font-size: 14px; color: #6b7280;">This verification code is strictly private and is valid for the next <strong>${expiresMinutes} minutes</strong>.</p>
      <p class="text" style="font-size: 13px; color: #4b5563; margin-top: 16px; border-top: 1px solid #1f2937; padding-top: 16px;">
        If you did not initiate this request or register for a DashURL account, you can safely ignore this email.
      </p>
    `;

    const html = getEmailTemplate(title, bodyContent);

    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`
┌────────────────────────────────────────────────────────┐
│               [DEV EMAIL BACKING LOG]                  │
├────────────────────────────────────────────────────────┤
│  To: ${email}
│  Subject: ${subject}
│  Verification OTP: ${otp}
│  Expires: in ${expiresMinutes} minutes
└────────────────────────────────────────────────────────┘
        `);
        return;
      }
      throw new Error('Resend client is not configured and system is in production.');
    }

    try {
      await resend.emails.send({
        from: `DashURL <${EMAIL_FROM}>`,
        to: email,
        subject: subject,
        html: html,
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✉️  [Resend Success]: Successfully sent OTP verification email to ${email}`);
      }
    } catch (error) {
      console.error('❌ [Resend Error]: Failed to send verification email via Resend:', error);
      throw new Error('Email delivery failed. Please try again.');
    }
  },

  /**
   * Sends a welcome email after successful account verification.
   */
  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const subject = 'Welcome to DashURL 🚀';
    const displayName = name ?? 'there';
    const title = `Welcome to the future of links, ${displayName}!`;
    const bodyContent = `
      <h2 class="title">${title}</h2>
      <p class="text">Your DashURL account is officially active and ready. We're excited to have you on board! DashURL gives you powerful tools to elevate your online presence:</p>
      
      <ul class="features-list">
        <li class="feature-item"><strong>Smart Links:</strong> Shorten long links with optional password protection and dynamic routing.</li>
        <li class="feature-item"><strong>Custom Aliases:</strong> Create highly branded short links using customized subpaths.</li>
        <li class="feature-item"><strong>Sleek QR Codes:</strong> Generate QR codes matching your visual aesthetics instantly.</li>
        <li class="feature-item"><strong>Deep Analytics:</strong> Analyze device, operating system, browser, and geographic location of every click.</li>
      </ul>
      
      <div class="btn-container">
        <a href="${FRONTEND_URL}/dashboard/links" class="btn">Open Dashboard</a>
      </div>
      
      <p class="text">If you have any questions, feel free to reply to this email. We are here to help you scale.</p>
    `;

    const html = getEmailTemplate('Welcome to DashURL', bodyContent);

    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`
┌────────────────────────────────────────────────────────┐
│               [DEV EMAIL BACKING LOG]                  │
├────────────────────────────────────────────────────────┤
│  To: ${email}
│  Subject: ${subject}
│  Welcome email triggered for: ${name || email}
└────────────────────────────────────────────────────────┘
        `);
        return;
      }
      return; // Do not crash flow in prod if welcome fails due to configuration missing
    }

    try {
      await resend.emails.send({
        from: `DashURL <${EMAIL_FROM}>`,
        to: email,
        subject: subject,
        html: html,
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✉️  [Resend Success]: Successfully sent Welcome email to ${email}`);
      }
    } catch (error) {
      console.error('❌ [Resend Error]: Failed to send welcome email via Resend:', error);
      // Non-blocking welcome email delivery failure
    }
  },

  /**
   * Sends a password reset email using Resend.
   */
  async sendPasswordResetEmail(email: string, resetUrl: string, expiresMinutes: number): Promise<void> {
    const subject = 'Reset your DashURL password';
    const title = 'Reset Password Request';
    const bodyContent = `
      <h2 class="title">${title}</h2>
      <p class="text">We received a request to reset the password for your DashURL account. Click the button below to choose a new password:</p>
      
      <div class="btn-container">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      
      <p class="text" style="font-size: 14px; color: #6b7280;">This password reset link will expire in <strong>${expiresMinutes} minutes</strong>.</p>
      
      <p class="text" style="font-size: 13px; color: #4b5563;">
        If you did not request a password reset, you can safely ignore this email. Your password will remain completely secure.
      </p>
      
      <div class="url-fallback">
        If the button above does not work, copy and paste this URL into your browser:
        <br/><br/>
        <a href="${resetUrl}" style="color: #ff6b00; text-decoration: underline;">${resetUrl}</a>
      </div>
    `;

    const html = getEmailTemplate('Reset your DashURL password', bodyContent);

    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`
┌────────────────────────────────────────────────────────┐
│               [DEV EMAIL BACKING LOG]                  │
├────────────────────────────────────────────────────────┤
│  To: ${email}
│  Subject: ${subject}
│  Reset Link: ${resetUrl}
│  Expires: in ${expiresMinutes} minutes
└────────────────────────────────────────────────────────┘
        `);
        return;
      }
      throw new Error('Resend client is not configured and system is in production.');
    }

    try {
      await resend.emails.send({
        from: `DashURL <${EMAIL_FROM}>`,
        to: email,
        subject: subject,
        html: html,
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✉️  [Resend Success]: Successfully sent Password Reset email to ${email}`);
      }
    } catch (error) {
      console.error('❌ [Resend Error]: Failed to send password reset email via Resend:', error);
      throw new Error('Email delivery failed. Please try again.');
    }
  }
};
