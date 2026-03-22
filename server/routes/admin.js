const express = require('express');
const router = express.Router();
const db = require('../db/database');
const bcrypt = require('bcryptjs');
const authenticate = require('../middleware/auth');

// Admin middleware — check if user is super admin
function requireAdmin(req, res, next) {
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
  if (!user || user.email !== 'admin@autoreach.io') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/users — List all registered users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.is_verified, u.has_completed_onboarding, u.createdAt, u.activeWorkspaceId,
        (SELECT COUNT(*) FROM leads WHERE user_id = u.id) as leadCount,
        (SELECT COUNT(*) FROM campaigns WHERE user_id = u.id) as campaignCount,
        (SELECT COUNT(*) FROM workspaces WHERE owner_id = u.id) as workspaceCount
      FROM users u ORDER BY u.createdAt DESC
    `).all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/reset-password — Reset a user's password
router.post('/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.params.id);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — Delete a user
router.delete('/users/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats — Overall platform stats
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const totalCampaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns').get().count;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'").get().count;
    res.json({ totalUsers, totalLeads, totalCampaigns, activeCampaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-log — Global audit trail for Super Admin
router.get('/audit-log', (req, res) => {
  const { action, limit = 50, offset = 0 } = req.query;
  try {
    const { getLogs } = require('../services/auditLog');
    const result = getLogs({
      userId: undefined,      // No user filter (global)
      workspaceId: undefined, // No workspace filter (global)
      action: action || undefined,
      limit: Math.min(parseInt(limit) || 50, 500),
      offset: parseInt(offset) || 0
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
