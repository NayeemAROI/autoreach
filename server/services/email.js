const nodemailer = require('nodemailer');

// System-level SMTP transporter for verification/reset emails
// Uses SMTP_* environment variables (Gmail App Password recommended)
let systemTransporter = null;

function getSystemTransporter() {
  if (systemTransporter) return systemTransporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('⚠️ SMTP not configured — emails will be logged to console only');
    return null;
  }

  systemTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Force IPv4 — Render free tier doesn't support IPv6 outbound
    tls: { rejectUnauthorized: false },
    dnsOptions: { family: 4 },
  });

  console.log(`📧 SMTP configured: ${user} via ${host}:${port}`);
  return systemTransporter;
}

const APP_NAME = process.env.APP_NAME || 'AutoReach';
const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@autoreach.com';

async function sendVerificationEmail(toEmail, code) {
  const transporter = getSystemTransporter();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 0;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚡ ${APP_NAME}</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email</h2>
        <p style="color: #4b5563; line-height: 1.6;">Enter this 6-digit code to complete your registration:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">${code}</span>
        </div>
        <p style="color: #9ca3af; font-size: 13px;">This code expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`✉️ [NO SMTP] Verification code for ${toEmail}: ${code}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: toEmail,
      subject: `${code} — Your ${APP_NAME} Verification Code`,
      html,
    });
    console.log(`✉️ Verification email sent to ${toEmail}`);
  } catch (err) {
    console.error(`❌ Failed to send verification email to ${toEmail}:`, err.message);
    // Still log the code so user can be unblocked manually
    console.log(`✉️ [FALLBACK] Verification code for ${toEmail}: ${code}`);
  }
}

async function sendPasswordResetEmail(toEmail, code) {
  const transporter = getSystemTransporter();

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 0;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚡ ${APP_NAME}</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">Password Reset</h2>
        <p style="color: #4b5563; line-height: 1.6;">Enter this 6-digit code to reset your password:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1;">${code}</span>
        </div>
        <p style="color: #9ca3af; font-size: 13px;">This code expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`🔑 [NO SMTP] Password reset code for ${toEmail}: ${code}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to: toEmail,
      subject: `${code} — Your ${APP_NAME} Password Reset Code`,
      html,
    });
    console.log(`🔑 Password reset email sent to ${toEmail}`);
  } catch (err) {
    console.error(`❌ Failed to send reset email to ${toEmail}:`, err.message);
    console.log(`🔑 [FALLBACK] Password reset code for ${toEmail}: ${code}`);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
