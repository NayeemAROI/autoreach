const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { logAction } = require('../services/auditLog');

router.use(auth);

// GET /api/profile — full profile + workspace info + preferences
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const user = db.prepare(`
      SELECT id, name, email, phone, title, timezone, avatar_url, role, plan,
             activeWorkspaceId, last_login_at, createdAt
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Workspace info
    const wsId = user.activeWorkspaceId;
    let workspace = null;
    let wsRole = null;
    if (wsId) {
      workspace = db.prepare('SELECT id, name, slug, createdAt FROM workspaces WHERE id = ?').get(wsId);
      const membership = db.prepare('SELECT role, joinedAt FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, userId);
      wsRole = membership?.role || 'member';
      if (workspace) {
        workspace.role = wsRole;
        workspace.joinedAt = membership?.joinedAt || '';
        workspace.memberCount = db.prepare('SELECT COUNT(*) as c FROM workspace_members WHERE workspace_id = ? AND status = ?').get(wsId, 'active')?.c || 0;
        workspace.linkedinConnected = !!db.prepare('SELECT linkedin_cookie_valid FROM workspaces WHERE id = ?').get(wsId)?.linkedin_cookie_valid;
        workspace.linkedinProfileName = db.prepare('SELECT linkedin_profile_name FROM workspaces WHERE id = ?').get(wsId)?.linkedin_profile_name || '';
      }
    }

    // Preferences
    let prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    if (!prefs) {
      // Create default preferences
      const prefId = uuidv4();
      db.prepare('INSERT INTO user_preferences (id, user_id) VALUES (?, ?)').run(prefId, userId);
      prefs = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        title: user.title || '',
        timezone: user.timezone || 'UTC+6',
        avatar_url: user.avatar_url || '',
        role: user.role,
        plan: user.plan || 'free',
        last_login_at: user.last_login_at || '',
        createdAt: user.createdAt,
      },
      workspace,
      preferences: {
        email_notifications: !!prefs.email_notifications,
        campaign_notifications: !!prefs.campaign_notifications,
        inbox_notifications: !!prefs.inbox_notifications,
        weekly_summary: !!prefs.weekly_summary,
        theme: prefs.theme || 'dark',
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile — update profile fields
router.patch('/', (req, res) => {
  const userId = req.user.id;
  const allowed = ['name', 'phone', 'title', 'timezone', 'avatar_url'];
  const fields = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields[key] = String(req.body[key]).trim();
    }
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  if (fields.name !== undefined && fields.name.length < 1) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }

  try {
    const updates = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(fields);
    db.prepare(`UPDATE users SET ${updates} WHERE id = ?`).run(...values, userId);

    logAction(req, 'profile.updated', 'user', userId, fields.name || '', { fields: Object.keys(fields) });
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile/password — change password
router.patch('/password', async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = bcrypt.compareSync(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, userId);

    logAction(req, 'profile.password_changed', 'user', userId, '');
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile/preferences — update notification prefs
router.patch('/preferences', (req, res) => {
  const userId = req.user.id;
  const allowed = ['email_notifications', 'campaign_notifications', 'inbox_notifications', 'weekly_summary', 'theme'];
  const fields = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields[key] = key === 'theme' ? String(req.body[key]) : (req.body[key] ? 1 : 0);
    }
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No valid fields' });
  }

  try {
    // Ensure preferences row exists
    const exists = db.prepare('SELECT id FROM user_preferences WHERE user_id = ?').get(userId);
    if (!exists) {
      db.prepare('INSERT INTO user_preferences (id, user_id) VALUES (?, ?)').run(uuidv4(), userId);
    }

    const updates = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    const values = Object.values(fields);
    db.prepare(`UPDATE user_preferences SET ${updates}, updated_at = datetime('now') WHERE user_id = ?`).run(...values, userId);

    res.json({ success: true, message: 'Preferences updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
