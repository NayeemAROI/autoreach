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

// GET /api/admin/workspaces — List all workspaces across the platform
router.get('/workspaces', (req, res) => {
  try {
    const workspaces = db.prepare(`
      SELECT w.id, w.name, w.slug, w.owner_id, w.createdAt,
        u.name as ownerName, u.email as ownerEmail,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as memberCount,
        (SELECT COUNT(*) FROM leads WHERE user_id = w.owner_id) as leadCount,
        (SELECT COUNT(*) FROM campaigns WHERE user_id = w.owner_id) as campaignCount
      FROM workspaces w
      LEFT JOIN users u ON u.id = w.owner_id
      ORDER BY w.createdAt DESC
    `).all();
    res.json({ workspaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/campaigns — List all campaigns across the platform (campaign monitor)
router.get('/campaigns', (req, res) => {
  try {
    const campaigns = db.prepare(`
      SELECT c.id, c.name, c.status, c.type, c.leadIds, c.stats, c.createdAt, c.updatedAt,
        u.name as ownerName, u.email as ownerEmail,
        (SELECT w.name FROM workspaces w WHERE w.owner_id = c.user_id LIMIT 1) as workspaceName
      FROM campaigns c
      LEFT JOIN users u ON u.id = c.user_id
      ORDER BY c.updatedAt DESC
    `).all();

    const result = campaigns.map(c => {
      const leadIds = JSON.parse(c.leadIds || '[]');
      const stats = JSON.parse(c.stats || '{}');
      return {
        ...c,
        totalLeads: leadIds.length,
        sent: stats.sent || 0,
        accepted: stats.accepted || 0,
        replied: stats.replied || 0,
        failed: stats.failed || 0,
        health: stats.failed > 5 ? 'degraded' : 'healthy',
      };
    });

    res.json({ campaigns: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/billing — List all subscriptions/billing info
router.get('/billing', (req, res) => {
  try {
    // Get all users with their plans
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.plan,
        (SELECT COUNT(*) FROM leads WHERE user_id = u.id) as leadCount,
        s.status as subStatus, s.plan as subPlan, s.currentPeriodEnd, s.cancelAtPeriodEnd
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      ORDER BY u.createdAt DESC
    `).all();

    const totalMrr = users.reduce((sum, u) => {
      if (u.plan === 'pro') return sum + 49;
      if (u.plan === 'business') return sum + 149;
      return sum;
    }, 0);

    const activeSubs = users.filter(u => u.subStatus === 'active').length;
    const freePlans = users.filter(u => !u.plan || u.plan === 'free').length;
    const proPlans = users.filter(u => u.plan === 'pro').length;
    const businessPlans = users.filter(u => u.plan === 'business').length;

    res.json({
      totalMrr,
      activeSubs,
      stats: { free: freePlans, pro: proPlans, business: businessPlans },
      subscriptions: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        plan: u.plan || 'free',
        status: u.subStatus || 'none',
        leadCount: u.leadCount,
        currentPeriodEnd: u.currentPeriodEnd,
        cancelAtPeriodEnd: u.cancelAtPeriodEnd,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/integrations — List all integration statuses
router.get('/integrations', (req, res) => {
  try {
    // Get users who have LinkedIn connected
    const integrations = db.prepare(`
      SELECT u.id, u.name, u.email,
        li.provider, li.status as liStatus, li.account_id, li.updatedAt as lastSync
      FROM users u
      LEFT JOIN linkedin_accounts li ON li.user_id = u.id
      ORDER BY li.updatedAt DESC
    `).all();

    res.json({
      integrations: integrations.filter(i => i.provider).map(i => ({
        userId: i.id,
        userName: i.name,
        userEmail: i.email,
        provider: i.provider,
        status: i.liStatus || 'disconnected',
        accountId: i.account_id,
        lastSync: i.lastSync,
        health: i.liStatus === 'active' ? 'healthy' : i.liStatus === 'checkpoint' ? 'degraded' : 'offline',
      })),
      summary: {
        total: integrations.length,
        connected: integrations.filter(i => i.liStatus === 'active').length,
        disconnected: integrations.filter(i => !i.provider).length,
        issues: integrations.filter(i => i.liStatus === 'checkpoint' || i.liStatus === 'error').length,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/health — System health metrics
router.get('/health', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalLeads = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
    const totalCampaigns = db.prepare('SELECT COUNT(*) as c FROM campaigns').get().c;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as c FROM campaigns WHERE status = 'active'").get().c;
    const todayActions = db.prepare("SELECT COUNT(*) as c FROM activities WHERE date(timestamp) = date('now')").get()?.c || 0;
    const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get()?.size || 0;

    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        health: 'healthy',
        sizeBytes: dbSize,
        sizeMB: (dbSize / 1024 / 1024).toFixed(1),
        totalUsers,
        totalLeads,
        totalCampaigns,
        activeCampaigns,
      },
      api: {
        health: 'healthy',
        todayActions,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/settings — Get platform settings
router.get('/settings', (req, res) => {
  try {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'platform_%'").all();
    const settings = {};
    rows.forEach(r => { settings[r.key.replace('platform_', '')] = r.value; });

    // Return defaults if not set
    res.json({
      settings: {
        platformName: settings.platformName || 'Autoreach',
        supportEmail: settings.supportEmail || 'support@autoreach.io',
        defaultTimezone: settings.defaultTimezone || 'UTC',
        campaignEngine: settings.campaignEngine !== 'false',
        leadEnrichment: settings.leadEnrichment !== 'false',
        emailVerification: settings.emailVerification === 'true',
        teamInvitations: settings.teamInvitations !== 'false',
        stripeBilling: settings.stripeBilling !== 'false',
        paymentFailureAlerts: settings.paymentFailureAlerts !== 'false',
        campaignFailureAlerts: settings.campaignFailureAlerts !== 'false',
        newUserNotifications: settings.newUserNotifications === 'true',
        integrationHealthAlerts: settings.integrationHealthAlerts !== 'false',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/settings — Update platform settings
router.put('/settings', (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object required' });
    }

    const upsert = db.prepare(`
      INSERT INTO settings (key, user_id, value) VALUES (?, 'admin', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        upsert.run(`platform_${key}`, String(value));
      }
    })();

    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
