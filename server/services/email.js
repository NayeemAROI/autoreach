const { Resend } = require('resend');

// Uses Resend HTTP API — works on Render (no SMTP ports needed)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const APP_NAME = process.env.APP_NAME || 'AutoReach';
// Resend free tier: use "onboarding@resend.dev" until domain verified
const FROM_EMAIL = process.env.EMAIL_FROM || 'AutoReach <onboarding@resend.dev>';

if (resend) {
  console.log(`📧 Resend email configured (from: ${FROM_EMAIL})`);
} else {
  console.warn('⚠️ RESEND_API_KEY not set — verification codes will be logged to console only');
}

async function sendVerificationEmail(toEmail, code) {
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

  if (!resend) {
    console.log(`✉️ [NO API KEY] Verification code for ${toEmail}: ${code}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `${code} — Your ${APP_NAME} Verification Code`,
      html,
    });

    if (error) {
      console.error(`❌ Resend error for ${toEmail}:`, error);
      console.log(`✉️ [FALLBACK] Verification code for ${toEmail}: ${code}`);
      return;
    }

    console.log(`✉️ Verification email sent to ${toEmail} (id: ${data?.id})`);
  } catch (err) {
    console.error(`❌ Failed to send verification email to ${toEmail}:`, err.message);
    console.log(`✉️ [FALLBACK] Verification code for ${toEmail}: ${code}`);
  }
}

async function sendPasswordResetEmail(toEmail, code) {
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

  if (!resend) {
    console.log(`🔑 [NO API KEY] Password reset code for ${toEmail}: ${code}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `${code} — Your ${APP_NAME} Password Reset Code`,
      html,
    });

    if (error) {
      console.error(`❌ Resend error for ${toEmail}:`, error);
      console.log(`🔑 [FALLBACK] Password reset code for ${toEmail}: ${code}`);
      return;
    }

    console.log(`🔑 Password reset email sent to ${toEmail} (id: ${data?.id})`);
  } catch (err) {
    console.error(`❌ Failed to send reset email to ${toEmail}:`, err.message);
    console.log(`🔑 [FALLBACK] Password reset code for ${toEmail}: ${code}`);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
