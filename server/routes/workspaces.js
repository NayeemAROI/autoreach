const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(auth);

// GET /api/workspaces - list user's workspaces
router.get('/', (req, res) => {
  const workspaces = db.prepare(`
    SELECT w.*, wm.role as memberRole,
      (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as memberCount
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ?
  `).all(req.user.id);
  res.json({ workspaces });
});

// POST /api/workspaces - create workspace
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Workspace name required' });

  const id = uuidv4();
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + Date.now().toString(36);

  try {
    db.prepare('INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)').run(id, name, slug, req.user.id);
    db.prepare('INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)').run(uuidv4(), id, req.user.id, 'owner');
    res.status(201).json({ workspace: { id, name, slug } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspaces/:id/switch - switch active workspace
router.post('/:id/switch', (req, res) => {
  const wsId = req.params.id;
  const member = db.prepare('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a member of this workspace' });

  db.prepare('UPDATE users SET activeWorkspaceId = ? WHERE id = ?').run(wsId, req.user.id);
  res.json({ message: 'Switched workspace', activeWorkspaceId: wsId });
});

// GET /api/workspaces/:id/members - list members
router.get('/:id/members', (req, res) => {
  const wsId = req.params.id;
  const member = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, req.user.id);
  if (!member) return res.status(403).json({ error: 'Not a member' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, wm.role, wm.joinedAt
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ?
  `).all(wsId);
  res.json({ members });
});

// POST /api/workspaces/:id/invite - invite member
router.post('/:id/invite', (req, res) => {
  const wsId = req.params.id;
  const { email, role = 'member' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Role must be admin or member' });

  // Check requester is owner or admin
  const requester = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, req.user.id);
  if (!requester || !['owner', 'admin'].includes(requester.role)) {
    return res.status(403).json({ error: 'Only owners and admins can invite members' });
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'User not found. They must register first.' });

  const existing = db.prepare('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare('INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)').run(uuidv4(), wsId, user.id, role);
  res.json({ message: `Invited ${email} as ${role}` });
});

// DELETE /api/workspaces/:id/members/:userId - remove member
router.delete('/:id/members/:userId', (req, res) => {
  const wsId = req.params.id;
  const targetUserId = req.params.userId;

  const requester = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, req.user.id);
  if (!requester || !['owner', 'admin'].includes(requester.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // Can't remove the owner
  const target = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, targetUserId);
  if (target?.role === 'owner') return res.status(400).json({ error: 'Cannot remove workspace owner' });

  db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(wsId, targetUserId);
  res.json({ message: 'Member removed' });
});

// PATCH /api/workspaces/:id/members/:userId - change member role
router.patch('/:id/members/:userId', (req, res) => {
  const wsId = req.params.id;
  const targetUserId = req.params.userId;
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Role must be admin or member' });

  const requester = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, req.user.id);
  if (requester?.role !== 'owner') return res.status(403).json({ error: 'Only owners can change roles' });

  db.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').run(role, wsId, targetUserId);
  res.json({ message: `Role updated to ${role}` });
});

module.exports = router;
