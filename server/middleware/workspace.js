const db = require('../db/database');

/**
 * Workspace middleware — injects req.workspace with the active workspace
 * Must be called AFTER auth middleware (needs req.user)
 */
function workspaceMiddleware(req, res, next) {
  if (!req.user) return next(); // auth middleware handles this

  const userId = req.user.id;

  // Get user's active workspace
  const user = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
  if (!user || !user.activeWorkspaceId) {
    return res.status(400).json({ error: 'No active workspace. Please create or select a workspace.' });
  }

  // Load workspace data
  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(user.activeWorkspaceId);
  if (!workspace) {
    return res.status(400).json({ error: 'Active workspace not found.' });
  }

  // Verify user has access to this workspace
  const membership = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspace.id, userId);
  if (!membership && workspace.owner_id !== userId) {
    return res.status(403).json({ error: 'No access to this workspace.' });
  }

  req.workspace = workspace;
  next();
}

module.exports = workspaceMiddleware;
