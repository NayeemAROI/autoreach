const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/workspaces — List user's workspaces
router.get('/', (req, res) => {
  const userId = req.user.id;
  const user = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
  
  const workspaces = db.prepare(`
    SELECT w.*, wm.role as memberRole
    FROM workspaces w
    JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE wm.user_id = ?
    ORDER BY w.createdAt ASC
  `).all(userId);

  // Add stats per workspace
  const result = workspaces.map(ws => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    role: ws.memberRole,
    isActive: ws.id === user?.activeWorkspaceId,
    linkedinConnected: !!ws.linkedin_cookie_valid,
    linkedinProfileName: ws.linkedin_profile_name || '',
    linkedinProfileUrl: ws.linkedin_profile_url || '',
    linkedinMemberId: ws.linkedin_member_id || '',
    leadsCount: db.prepare('SELECT COUNT(*) as c FROM leads WHERE workspace_id = ?').get(ws.id)?.c || 0,
    campaignsCount: db.prepare('SELECT COUNT(*) as c FROM campaigns WHERE workspace_id = ?').get(ws.id)?.c || 0,
    createdAt: ws.createdAt,
  }));

  res.json({ workspaces: result, activeWorkspaceId: user?.activeWorkspaceId });
});

// POST /api/workspaces — Create new workspace
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Workspace name is required.' });
  }

  // Check plan limits
  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId);
  const wsCount = db.prepare('SELECT COUNT(*) as c FROM workspace_members WHERE user_id = ?').get(userId)?.c || 0;
  const limits = { free: 1, pro: 3, business: 10 };
  const maxWs = limits[user?.plan] || 1;

  if (wsCount >= maxWs) {
    return res.status(403).json({ error: `Your ${user?.plan || 'free'} plan allows up to ${maxWs} workspace(s). Upgrade to add more.` });
  }

  const wsId = uuidv4();
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

  try {
    db.prepare('INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)').run(wsId, name.trim(), slug, userId);
    db.prepare('INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)').run(uuidv4(), wsId, userId, 'owner');

    res.json({
      workspace: { id: wsId, name: name.trim(), slug, linkedinConnected: false },
      message: 'Workspace created! Connect a LinkedIn account to start.'
    });
  } catch (e) {
    console.error('Create workspace error:', e);
    res.status(500).json({ error: 'Failed to create workspace.' });
  }
});

// PATCH /api/workspaces/:id — Update workspace name
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user.id;

  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found.' });
  if (ws.owner_id !== userId) return res.status(403).json({ error: 'Only the owner can update this workspace.' });

  if (name) {
    db.prepare('UPDATE workspaces SET name = ? WHERE id = ?').run(name.trim(), id);
  }

  res.json({ success: true });
});

// DELETE /api/workspaces/:id — Delete workspace and all its data
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found.' });
  if (ws.owner_id !== userId) return res.status(403).json({ error: 'Only the owner can delete this workspace.' });

  // Don't allow deleting last workspace
  const wsCount = db.prepare('SELECT COUNT(*) as c FROM workspace_members WHERE user_id = ?').get(userId)?.c || 0;
  if (wsCount <= 1) return res.status(400).json({ error: 'Cannot delete your only workspace.' });

  try {
    // Delete all workspace data
    db.prepare('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE workspace_id = ?)').run(id);
    db.prepare('DELETE FROM conversations WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM campaign_leads WHERE campaign_id IN (SELECT id FROM campaigns WHERE workspace_id = ?)').run(id);
    db.prepare('DELETE FROM activities WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM events WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM leads WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM campaigns WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);

    // If this was the active workspace, switch to another
    const user = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
    if (user?.activeWorkspaceId === id) {
      const nextWs = db.prepare('SELECT workspace_id FROM workspace_members WHERE user_id = ? LIMIT 1').get(userId);
      if (nextWs) {
        db.prepare('UPDATE users SET activeWorkspaceId = ? WHERE id = ?').run(nextWs.workspace_id, userId);
      }
    }

    res.json({ success: true, message: 'Workspace and all data deleted.' });
  } catch (e) {
    console.error('Delete workspace error:', e);
    res.status(500).json({ error: 'Failed to delete workspace.' });
  }
});

// POST /api/workspaces/:id/switch — Switch active workspace
router.post('/:id/switch', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify user has access
  const membership = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(id, userId);
  if (!membership) return res.status(403).json({ error: 'No access to this workspace.' });

  db.prepare('UPDATE users SET activeWorkspaceId = ? WHERE id = ?').run(id, userId);

  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  res.json({
    success: true,
    workspace: {
      id: ws.id,
      name: ws.name,
      linkedinConnected: !!ws.linkedin_cookie_valid,
      linkedinProfileName: ws.linkedin_profile_name || '',
    }
  });
});

// POST /api/workspaces/:id/connect — Connect LinkedIn to workspace
router.post('/:id/connect', async (req, res) => {
  const { id } = req.params;
  const { cookie } = req.body;
  const userId = req.user.id;

  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found.' });
  if (ws.owner_id !== userId) return res.status(403).json({ error: 'Only the owner can connect LinkedIn.' });

  if (!cookie || !cookie.trim()) {
    return res.status(400).json({ error: 'LinkedIn cookie (li_at) is required.' });
  }

  const liAt = cookie.trim();
  const csrf = `ajax:${Date.now()}`;

  // Validate by calling LinkedIn /me endpoint
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://www.linkedin.com/voyager/api/me', {
      headers: {
        'cookie': `li_at=${liAt}; JSESSIONID="${csrf}"`,
        'csrf-token': csrf,
        'x-restli-protocol-version': '2.0.0',
      }
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Invalid LinkedIn cookie. Please check and try again.' });
    }

    const data = await response.json();
    const profileName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'LinkedIn User';
    const memberId = data.publicIdentifier || data.miniProfile?.publicIdentifier || '';
    const profileUrl = memberId ? `https://linkedin.com/in/${memberId}` : '';

    db.prepare(`
      UPDATE workspaces SET 
        linkedin_cookie = ?, linkedin_csrf = ?, linkedin_cookie_valid = 1,
        linkedin_profile_name = ?, linkedin_profile_url = ?, linkedin_member_id = ?,
        linkedin_connected_at = datetime('now')
      WHERE id = ?
    `).run(liAt, csrf, profileName, profileUrl, memberId, id);

    res.json({
      success: true,
      profileName,
      profileUrl,
      memberId,
    });
  } catch (err) {
    console.error('LinkedIn connect error:', err);
    res.status(500).json({ error: 'Failed to validate LinkedIn cookie.' });
  }
});

// POST /api/workspaces/:id/disconnect — Disconnect LinkedIn from workspace
router.post('/:id/disconnect', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found.' });
  if (ws.owner_id !== userId) return res.status(403).json({ error: 'Only the owner can disconnect LinkedIn.' });

  db.prepare(`
    UPDATE workspaces SET 
      linkedin_cookie = '', linkedin_csrf = '', linkedin_cookie_valid = 0,
      linkedin_profile_name = '', linkedin_profile_url = '', linkedin_member_id = '',
      linkedin_connected_at = ''
    WHERE id = ?
  `).run(id);

  res.json({ success: true });
});

module.exports = router;
