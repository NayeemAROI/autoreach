const express = require('express');
const router = express.Router();
const db = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');
const { logAction } = require('../services/auditLog');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_automation_key';
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_DAYS = 30;
const { validateBody, schemas } = require('../middleware/validate');

// Generate a secure refresh token and store it
function generateRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (id, user_id, token, expiresAt) VALUES (?, ?, ?, ?)').run(uuidv4(), userId, token, expiresAt);
  // Clean up expired tokens for this user
  db.prepare("DELETE FROM refresh_tokens WHERE user_id = ? AND expiresAt < datetime('now')").run(userId);
  return { token, expiresAt };
}

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role || 'member', activeWorkspaceId: user.activeWorkspaceId || '' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

// POST /api/auth/register
router.post('/register', validateBody(schemas.register), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (unverified by default)
    db.prepare('INSERT INTO users (id, name, email, password, is_verified) VALUES (?, ?, ?, ?, ?)')
      .run(userId, name, email.toLowerCase(), hashedPassword, 0);

    // Set default settings for this new user
    const defaultSettings = [
      ['dailyConnectionLimit', '25'],
      ['dailyMessageLimit', '50'],
      ['dailyEmailLimit', '100'],
      ['workingHoursStart', '09:00'],
      ['workingHoursEnd', '18:00'],
      ['timezone', 'UTC+6'],
      ['warmupMode', 'false'],
      ['warmupDays', '14'],
      ['minDelay', '30'],
      ['maxDelay', '120'],
      ['blacklist', '[]']
    ];

    const insertSetting = db.prepare('INSERT INTO settings (key, user_id, value) VALUES (?, ?, ?)');
    db.transaction(() => {
      for (const [key, value] of defaultSettings) {
        insertSetting.run(`${key}_${userId}`, userId, value);
      }
    })();

    // Generate random 6-digit verification code
    const verifyToken = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    db.prepare('INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), userId, verifyToken, expiresAt);

    // Create default workspace for this user
    const wsId = uuidv4();
    const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-ws';
    db.prepare('INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)').run(wsId, `${name}'s Workspace`, slug, userId);
    db.prepare('INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)').run(uuidv4(), wsId, userId, 'owner');
    db.prepare('UPDATE users SET activeWorkspaceId = ? WHERE id = ?').run(wsId, userId);

    // Send verification email
    sendVerificationEmail(email.toLowerCase(), verifyToken).catch(err => console.error('Email send error:', err));

    logAction({ _userId: userId, ip: req.ip, headers: req.headers }, 'auth.register', 'auth', userId, name, { email: email.toLowerCase() });

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      user: { id: userId, name, email: email.toLowerCase() }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', validateBody(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check Verification
    if (user.is_verified === 0) {
      return res.status(403).json({ 
        error: 'Email not verified',
        message: 'Please check your email to verify your account before logging in.'
      });
    }

    // Update last login time
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    logAction({ _userId: user.id, ip: req.ip, headers: req.headers }, 'auth.login', 'auth', user.id, user.name, { email: user.email });

    res.json({
      message: 'Login successful',
      token: accessToken,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      user: { id: user.id, name: user.name, email: user.email, role: user.role || 'member', activeWorkspaceId: user.activeWorkspaceId || '', has_completed_onboarding: user.has_completed_onboarding }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /api/auth/refresh (Get new access token using refresh token)
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const stored = db.prepare("SELECT * FROM refresh_tokens WHERE token = ? AND expiresAt > datetime('now')").get(refreshToken);
    if (!stored) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const user = db.prepare('SELECT id, name, email, role, activeWorkspaceId FROM users WHERE id = ?').get(stored.user_id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    // Rotate: delete old, issue new
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);
    const newRefresh = generateRefreshToken(user.id);
    const accessToken = generateAccessToken(user);

    res.json({
      token: accessToken,
      refreshToken: newRefresh.token,
      refreshTokenExpiresAt: newRefresh.expiresAt
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// GET /api/auth/me (Verify token and return user profile)
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user data
    const user = db.prepare('SELECT id, name, email, role, activeWorkspaceId, createdAt, has_completed_onboarding FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get user's workspaces
    const workspaces = db.prepare(`
      SELECT w.id, w.name, w.slug, wm.role as memberRole
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ?
    `).all(decoded.id);

    res.json({ user: { ...user, workspaces } });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    const verification = db.prepare('SELECT id, expires_at FROM email_verifications WHERE user_id = ? AND token = ?').get(user.id, code);

    if (!verification) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Update user
    db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(user.id);

    // Delete token
    db.prepare('DELETE FROM email_verifications WHERE id = ?').run(verification.id);

    logAction({ _userId: user.id, ip: req.ip, headers: req.headers }, 'auth.email_verified', 'auth', user.id, '', { email });
    res.json({ message: 'Email successfully verified.' });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
});
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase());
    
    // Always respond with success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Generate random 6-digit reset code
    const resetToken = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store reset token (reuse email_verifications table)
    db.prepare('INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), user.id, `reset_${resetToken}`, expiresAt);

    // Send password reset email
    sendPasswordResetEmail(email.toLowerCase(), resetToken).catch(err => console.error('Email send error:', err));

    res.json({ message: 'If an account with that email exists, a verification code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const verification = db.prepare('SELECT id, expires_at FROM email_verifications WHERE user_id = ? AND token = ?').get(user.id, `reset_${code}`);

    if (!verification) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (new Date(verification.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);

    // Delete token
    db.prepare('DELETE FROM email_verifications WHERE id = ?').run(verification.id);

    logAction({ _userId: user.id, ip: req.ip, headers: req.headers }, 'auth.password_reset', 'auth', user.id, '', { email });
    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

