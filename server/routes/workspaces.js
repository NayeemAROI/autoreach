const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

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

  // Check plan limits — count only workspaces the user OWNS (not memberships from invites)
  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId);
  const ownedCount = db.prepare("SELECT COUNT(*) as c FROM workspace_members WHERE user_id = ? AND role = 'owner'").get(userId)?.c || 0;
  const limits = { free: 5, pro: 10, business: 50 };
  const maxWs = limits[user?.plan] || 5;

  if (ownedCount >= maxWs) {
    return res.status(403).json({ error: `Your ${user?.plan || 'free'} plan allows up to ${maxWs} workspace(s). Upgrade to add more.` });
  }

  const wsId = uuidv4();
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

  try {
    db.prepare('INSERT INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)').run(wsId, name.trim(), slug, userId);
    db.prepare('INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)').run(uuidv4(), wsId, userId, 'owner');

    logAction(req, 'workspace.created', 'workspace', wsId, name.trim());
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

    logAction(req, 'workspace.updated', 'workspace', id, name?.trim() || '');
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

    logAction(req, 'workspace.deleted', 'workspace', id, ws.name);
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
    logAction(req, 'workspace.switched', 'workspace', id, ws.name);
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

    // Check if this LinkedIn profile is already connected to another workspace
    if (memberId) {
      const existing = db.prepare(
        'SELECT id, name FROM workspaces WHERE linkedin_member_id = ? AND linkedin_cookie_valid = 1 AND id != ?'
      ).get(memberId, id);
      if (existing) {
        return res.status(409).json({ 
          error: `This LinkedIn account is already connected to workspace "${existing.name}". Disconnect it there first.` 
        });
      }
    }

    db.prepare(`
      UPDATE workspaces SET 
        linkedin_cookie = ?, linkedin_csrf = ?, linkedin_cookie_valid = 1,
        linkedin_profile_name = ?, linkedin_profile_url = ?, linkedin_member_id = ?,
        linkedin_connected_at = datetime('now')
      WHERE id = ?
    `).run(liAt, csrf, profileName, profileUrl, memberId, id);

    logAction(req, 'workspace.linkedin_connected', 'workspace', id, profileName, { memberId, profileUrl });
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

  logAction(req, 'workspace.linkedin_disconnected', 'workspace', id, ws.linkedin_profile_name || '');
  res.json({ success: true });
});

// ===== MEMBER MANAGEMENT =====

const { requireRole } = require('../middleware/roleGuard');
const { PLANS, getUserPlan } = require('../config/plans');
const crypto = require('crypto');

// Helper: get workspace id from active workspace
function getWsId(req) {
  return req.params.id || req.user.activeWorkspaceId;
}

// GET /api/workspaces/:id/members — list all members (admin/owner)
router.get('/:id/members', requireRole('owner', 'admin'), (req, res) => {
  const wsId = req.params.id;
  try {
    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_url, u.last_login_at, u.createdAt,
             wm.role, wm.status, wm.joinedAt, wm.invited_at
      FROM workspace_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ?
      ORDER BY
        CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
        wm.joinedAt ASC
    `).all(wsId);

    // Also get pending invites
    const invites = db.prepare(`
      SELECT id, email, role, status, created_at, expires_at
      FROM workspace_invites
      WHERE workspace_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).all(wsId);

    // Seat info
    const ws = db.prepare('SELECT owner_id FROM workspaces WHERE id = ?').get(wsId);
    const ownerPlan = getUserPlan(db, ws?.owner_id || req.user.id);
    const seatLimit = ownerPlan.limits.seats || ownerPlan.limits.teamMembers || 1;
    const seatsUsed = members.filter(m => m.status === 'active').length;

    res.json({ members, invites, seats: { used: seatsUsed, limit: seatLimit } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspaces/:id/members/invite — invite user
router.post('/:id/members/invite', requireRole('owner', 'admin'), (req, res) => {
  const wsId = req.params.id;
  const { email, role = 'member' } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!['member', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be member or admin' });
  }

  // Only owner can invite as admin
  if (role === 'admin' && req.workspaceRole !== 'owner') {
    return res.status(403).json({ error: 'Only workspace owner can invite admins' });
  }

  try {
    // Check seat limit
    const ws = db.prepare('SELECT owner_id FROM workspaces WHERE id = ?').get(wsId);
    const ownerPlan = getUserPlan(db, ws?.owner_id || req.user.id);
    const seatLimit = ownerPlan.limits.seats || ownerPlan.limits.teamMembers || 1;
    const currentMembers = db.prepare('SELECT COUNT(*) as c FROM workspace_members WHERE workspace_id = ? AND status = ?').get(wsId, 'active')?.c || 0;

    if (currentMembers >= seatLimit) {
      return res.status(403).json({ error: `Seat limit reached (${seatLimit}). Upgrade your plan to add more members.` });
    }

    // Check if already a member
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingUser) {
      const existingMember = db.prepare('SELECT id, status FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, existingUser.id);
      if (existingMember && existingMember.status === 'active') {
        return res.status(409).json({ error: 'User is already a member of this workspace' });
      }
    }

    // Check for existing pending invite
    const existingInvite = db.prepare('SELECT id FROM workspace_invites WHERE workspace_id = ? AND email = ? AND status = ?').get(wsId, normalizedEmail, 'pending');
    if (existingInvite) {
      return res.status(409).json({ error: 'An invitation is already pending for this email' });
    }

    // Create invite
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    const inviteId = uuidv4();

    db.prepare(`
      INSERT INTO workspace_invites (id, workspace_id, email, role, token, status, invited_by, expires_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(inviteId, wsId, normalizedEmail, role, token, req.user.id, expiresAt);

    logAction(req, 'workspace.member_invited', 'workspace', wsId, normalizedEmail, { role });

    // If user already exists in system, auto-accept
    if (existingUser) {
      // Add them directly
      const existingMember = db.prepare('SELECT id, status FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, existingUser.id);
      if (existingMember) {
        db.prepare("UPDATE workspace_members SET status = 'active', role = ? WHERE id = ?").run(role, existingMember.id);
      } else {
        db.prepare('INSERT INTO workspace_members (id, workspace_id, user_id, role, status, invited_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))').run(uuidv4(), wsId, existingUser.id, role, 'active');
      }
      db.prepare("UPDATE workspace_invites SET status = 'accepted' WHERE id = ?").run(inviteId);

      return res.json({ success: true, message: 'User added to workspace', autoAccepted: true });
    }

    console.log(`📧 Invite sent to ${normalizedEmail} — token: ${token}`);
    res.json({ success: true, message: 'Invitation sent', token, inviteId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/workspaces/:id/members/:userId/role — change role
router.patch('/:id/members/:userId/role', requireRole('owner'), (req, res) => {
  const { id: wsId, userId: targetUserId } = req.params;
  const { role } = req.body;

  if (!['member', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be member or admin' });
  }

  // Can't change own role
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  try {
    // Verify target is a member
    const target = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, targetUserId);
    if (!target) return res.status(404).json({ error: 'Member not found' });

    // Can't change owner role
    if (target.role === 'owner') {
      return res.status(403).json({ error: 'Cannot change owner role' });
    }

    db.prepare('UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?').run(role, wsId, targetUserId);
    logAction(req, 'workspace.role_changed', 'workspace', wsId, targetUserId, { newRole: role });
    res.json({ success: true, message: `Role changed to ${role}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/workspaces/:id/members/:userId/status — activate/deactivate
router.patch('/:id/members/:userId/status', requireRole('owner', 'admin'), (req, res) => {
  const { id: wsId, userId: targetUserId } = req.params;
  const { status } = req.body;

  if (!['active', 'deactivated'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active or deactivated' });
  }

  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own status' });
  }

  try {
    const target = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, targetUserId);
    if (!target) return res.status(404).json({ error: 'Member not found' });

    // Admin can't deactivate owner
    if (target.role === 'owner') {
      return res.status(403).json({ error: 'Cannot deactivate workspace owner' });
    }

    // Admin can't deactivate other admins
    if (target.role === 'admin' && req.workspaceRole === 'admin') {
      return res.status(403).json({ error: 'Admins cannot change status of other admins' });
    }

    db.prepare('UPDATE workspace_members SET status = ? WHERE workspace_id = ? AND user_id = ?').run(status, wsId, targetUserId);
    logAction(req, `workspace.member_${status}`, 'workspace', wsId, targetUserId);
    res.json({ success: true, message: `Member ${status === 'active' ? 'activated' : 'deactivated'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspaces/:id/members/:userId — remove member
router.delete('/:id/members/:userId', requireRole('owner', 'admin'), (req, res) => {
  const { id: wsId, userId: targetUserId } = req.params;

  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot remove yourself' });
  }

  try {
    const target = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsId, targetUserId);
    if (!target) return res.status(404).json({ error: 'Member not found' });

    if (target.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove workspace owner' });
    }

    if (target.role === 'admin' && req.workspaceRole === 'admin') {
      return res.status(403).json({ error: 'Admins cannot remove other admins' });
    }

    db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(wsId, targetUserId);

    // If removed user had this as active workspace, switch them
    const removedUser = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(targetUserId);
    if (removedUser?.activeWorkspaceId === wsId) {
      const nextWs = db.prepare('SELECT workspace_id FROM workspace_members WHERE user_id = ? LIMIT 1').get(targetUserId);
      db.prepare('UPDATE users SET activeWorkspaceId = ? WHERE id = ?').run(nextWs?.workspace_id || '', targetUserId);
    }

    logAction(req, 'workspace.member_removed', 'workspace', wsId, targetUserId);
    res.json({ success: true, message: 'Member removed from workspace' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workspaces/:id/invites/:inviteId — cancel invite
router.delete('/:id/invites/:inviteId', requireRole('owner', 'admin'), (req, res) => {
  const { id: wsId, inviteId } = req.params;
  try {
    db.prepare("DELETE FROM workspace_invites WHERE id = ? AND workspace_id = ?").run(inviteId, wsId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workspaces/join/:token — accept invite (no auth required from a fresh user)
router.post('/join/:token', (req, res) => {
  const { token } = req.params;
  try {
    const invite = db.prepare("SELECT * FROM workspace_invites WHERE token = ? AND status = 'pending'").get(token);
    if (!invite) return res.status(404).json({ error: 'Invalid or expired invite' });

    if (new Date(invite.expires_at) < new Date()) {
      db.prepare("UPDATE workspace_invites SET status = 'expired' WHERE id = ?").run(invite.id);
      return res.status(400).json({ error: 'Invite has expired' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email);
    if (!user) {
      return res.json({ requiresRegistration: true, email: invite.email, workspace_id: invite.workspace_id });
    }

    // Add user to workspace
    const existing = db.prepare('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(invite.workspace_id, user.id);
    if (existing) {
      db.prepare("UPDATE workspace_members SET status = 'active', role = ? WHERE id = ?").run(invite.role, existing.id);
    } else {
      db.prepare('INSERT INTO workspace_members (id, workspace_id, user_id, role, status) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), invite.workspace_id, user.id, invite.role, 'active');
    }

    db.prepare("UPDATE workspace_invites SET status = 'accepted' WHERE id = ?").run(invite.id);
    res.json({ success: true, message: 'Joined workspace!', workspace_id: invite.workspace_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workspaces/:id/settings — workspace settings (admin/owner)
router.get('/:id/settings', requireRole('owner', 'admin'), (req, res) => {
  const wsId = req.params.id;
  try {
    const ws = db.prepare(`
      SELECT id, name, slug, owner_id,
             linkedin_cookie_valid, linkedin_profile_name, linkedin_profile_url,
             linkedin_member_id, linkedin_connected_at, createdAt
      FROM workspaces WHERE id = ?
    `).get(wsId);
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });

    const memberCount = db.prepare('SELECT COUNT(*) as c FROM workspace_members WHERE workspace_id = ?').get(wsId)?.c || 0;
    const isOwner = ws.owner_id === req.user.id;

    res.json({
      workspace: {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        owner_id: ws.owner_id,
        linkedinConnected: !!ws.linkedin_cookie_valid,
        linkedinProfileName: ws.linkedin_profile_name || '',
        linkedinProfileUrl: ws.linkedin_profile_url || '',
        linkedinConnectedAt: ws.linkedin_connected_at || '',
        memberCount,
        createdAt: ws.createdAt,
      },
      isOwner
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
