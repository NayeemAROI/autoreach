const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getLogs } = require('../services/auditLog');

router.use(auth);

// GET /api/audit-log — paginated, filterable audit trail
router.get('/', (req, res) => {
  const { action, entityType, from, to, limit = 100, offset = 0 } = req.query;
  const userId = req.user.id;

  // Get user's active workspace
  const db = require('../db/database');
  const user = db.prepare('SELECT activeWorkspaceId, role FROM users WHERE id = ?').get(userId);

  try {
    const result = getLogs({
      userId: user?.role === 'owner' ? undefined : userId, // owners see all
      workspaceId: user?.activeWorkspaceId || '',
      action: action || undefined,
      entityType: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
      limit: Math.min(parseInt(limit) || 100, 500),
      offset: parseInt(offset) || 0
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
