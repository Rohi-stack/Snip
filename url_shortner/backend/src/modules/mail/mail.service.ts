import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@snip.ly';

// Initialize resend client if key is provided
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

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
        .logo {
          font-size: 28px;
          font-weight: 800;
          color: #ff6b00;
          text-decoration: none;
          margin-bottom: 24px;
          display: inline-block;
          letter-spacing: -0.5px;
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .text {
          font-size: 16px;
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
          font-size: 36px;
          font-weight: 800;
          color: #ff6b00;
          letter-spacing: 6px;
          margin: 0;
        }
        .btn {
          display: inline-block;
          background-color: #ff6b00;
          color: #ffffff;
          font-weight: 600;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-size: 16px;
          margin-bottom: 24px;
          transition: background-color 0.2s;
        }
        .btn:hover {
          background-color: #e05e00;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <a href="https://snip.ly" class="logo">Snip<span>.</span></a>
          ${bodyContent}
        </div>
        <div class="footer">
          <p>This is an automated transactional security message from Snip.</p>
          <p>&copy; ${new Date().getFullYear()} Snip. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export const mailService = {
  /**
   * Sends a 6-digit OTP verification code to active users.
   */
  async sendVerificationOtp(email: string, otp: string, expiresMinutes: number): Promise<void> {
    const subject = `Verify your Snip Account [${otp}]`;
    const title = 'Verify your email address';
    const bodyContent = `
      <h2 class="title">${title}</h2>
      <p class="text">Thank you for signing up for Snip! To complete your registration and activate your account, please use the 6-digit verification code below:</p>
      <div class="highlight-box">
        <h1 class="otp">${otp}</h1>
      </div>
      <p class="text" style="font-size: 14px; color: #6b7280;">This verification code is strictly private and is valid for the next <strong>${expiresMinutes} minutes</strong>. If you did not register for a Snip account, you can safely ignore this email.</p>
    `;

    const html = getEmailTemplate(title, bodyContent);

    if (!resend) {
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

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: subject,
        html: html,
      });
    } catch (error) {
      console.error('Failed to send verification email via Resend:', error);
      throw new Error('Email delivery failed. Please try again.');
    }
  },

  /**
   * Sends a welcome email after successful account verification.
   */
  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const subject = 'Welcome to Snip!';
    const displayName = name ?? 'there';
    const title = `Welcome, ${displayName}!`;
    const bodyContent = `
      <h2 class="title">${title}</h2>
      <p class="text">Your account is officially active and ready. Snip gives you full SaaS capabilities to shorten URLs, generate sleek brand-matching QR codes, and trace device & browser analytics instantly.</p>
      <p class="text">Get started right away by creating your first link in your dashboard!</p>
      <a href="http://localhost:4200/dashboard/links" class="btn">Go to Dashboard</a>
      <p class="text">If you have any questions or feedback, we are always here to help you scale.</p>
    `;

    const html = getEmailTemplate('Welcome to Snip', bodyContent);

    if (!resend) {
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

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: subject,
        html: html,
      });
    } catch (error) {
      console.error('Failed to send welcome email via Resend:', error);
      // Don't crash registration if welcome fails
    }
  }
};
