const db = require('../db/database');

/**
 * Role guard middleware factory.
 * Checks user's role in the active workspace.
 * Usage: requireRole('owner', 'admin')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userId = req.user.id;
    const wsId = req.user.activeWorkspaceId || req.params.id;

    if (!wsId) {
      return res.status(400).json({ error: 'No workspace context' });
    }

    const membership = db.prepare(
      'SELECT role, status FROM workspace_members WHERE workspace_id = ? AND user_id = ?'
    ).get(wsId, userId);

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    if (membership.status !== 'active') {
      return res.status(403).json({ error: 'Account is deactivated in this workspace' });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    req.workspaceRole = membership.role;
    next();
  };
}

module.exports = { requireRole };
