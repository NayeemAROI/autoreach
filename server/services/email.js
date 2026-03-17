const nodemailer = require('nodemailer');

const db = require('../db/database');

// For local development & testing without a real SMTP, we can use Ethereal Email
// Alternatively, if the user configures their own SMTP, we can use that.

// We will create transporters on the fly based on user_id, 
// because in a multi-user app every user has their own SMTP settings.
const createTransporter = async (userId = null) => {
  let config = {};

  if (userId) {
    // Try to get user SMTP config
    const settings = db.prepare('SELECT key, value FROM settings WHERE user_id = ? AND key LIKE ?').all(userId, 'smtp%');
    settings.forEach(s => {
      // settings keys are usually stored like 'smtpHost_user123'
      const baseKey = s.key.split('_')[0]; 
      config[baseKey] = s.value;
    });
  }

  // Fallback to Test Ethereal if no custom config
  if (!config.smtpHost) {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: parseInt(config.smtpPort, 10) || 587,
    secure: config.smtpSecure === 'true',
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
};

async function sendVerificationEmail(toEmail, token) {
  const transporter = await createTransporter(null); // System email

  const verifyUrl = `http://localhost:3001/api/auth/verify?token=${token}`;

  const info = await transporter.sendMail({
    from: '"Outreach Node" <noreply@automation.local>',
    to: toEmail,
    subject: 'Complete your registration - Outreach Node',
    text: `Welcome! Please verify your email by clicking: ${verifyUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Welcome to Outreach Node!</h2>
        <p>Thank you for creating an account. To complete your registration and secure your workspace, we just need to verify your email address.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:<br/>${verifyUrl}</p>
      </div>
    `,
  });

  console.log('📨 Verification email sent to:', toEmail);
  if (info.messageId && info.messageId.includes('ethereal')) {
    console.log('👀 Preview URL: ' + nodemailer.getTestMessageUrl(info));
  }
}

async function sendCampaignEmail(userId, leadEmail, subject, bodyHtml) {
  try {
    const transporter = await createTransporter(userId);
    
    // Get sender info
    const sender = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId);

    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.email}>`, // Could be overridden by SMTP settings
      to: leadEmail,
      subject: subject || 'Following up',
      html: bodyHtml,
    });

    console.log(`📨 Campaign email sent to ${leadEmail}`);
    if (info.messageId && info.messageId.includes('ethereal')) {
      console.log('👀 Preview URL: ' + nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (err) {
    console.error(`📧 Failed to send campaign email to ${leadEmail}`, err);
    return false;
  }
}

module.exports = {
  sendVerificationEmail,
  sendCampaignEmail
};
