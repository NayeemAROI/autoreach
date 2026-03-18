/**
 * Audit Log Service — tracks all user actions across the app.
 * 
 * Usage:
 *   const { logAction } = require('../services/auditLog');
 *   logAction(req, 'lead.created', 'lead', lead.id, lead.firstName + ' ' + lead.lastName, { source: 'manual' });
 */

const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

function getWorkspaceId(userId) {
  const user = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
  return user?.activeWorkspaceId || '';
}

/**
 * Log an action to the audit trail.
 * @param {object} req - Express request (for user_id, IP, user-agent)
 * @param {string} action - Action key like 'lead.created', 'campaign.started', 'auth.login'
 * @param {string} entityType - Entity type: 'lead', 'campaign', 'workspace', 'settings', 'auth'
 * @param {string} entityId - ID of the entity acted upon
 * @param {string} entityName - Human-readable name of the entity
 * @param {object} details - Additional metadata (JSON-serializable)
 */
function logAction(req, action, entityType = '', entityId = '', entityName = '', details = {}) {
  try {
    const userId = req?.user?.id || req?._userId || '';
    const wsId = userId ? getWorkspaceId(userId) : '';
    const ip = req?.ip || req?.connection?.remoteAddress || '';
    const ua = req?.headers?.['user-agent']?.substring(0, 200) || '';

    db.prepare(`
      INSERT INTO audit_log (id, user_id, workspace_id, action, entity_type, entity_id, entity_name, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, wsId, action, entityType, entityId, entityName, JSON.stringify(details), ip, ua);
  } catch (e) {
    console.warn('[AuditLog] Failed to log action:', e.message);
  }
}

/**
 * Get audit logs with optional filters.
 */
function getLogs({ userId, workspaceId, action, entityType, from, to, limit = 100, offset = 0 }) {
  let query = 'SELECT al.*, u.name as userName, u.email as userEmail FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
  const params = [];

  if (userId) { query += ' AND al.user_id = ?'; params.push(userId); }
  if (workspaceId) { query += ' AND al.workspace_id = ?'; params.push(workspaceId); }
  if (action) { query += ' AND al.action LIKE ?'; params.push(`${action}%`); }
  if (entityType) { query += ' AND al.entity_type = ?'; params.push(entityType); }
  if (from) { query += ' AND al.created_at >= ?'; params.push(from); }
  if (to) { query += ' AND al.created_at <= ?'; params.push(to); }

  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logs = db.prepare(query).all(...params);
  const total = db.prepare(query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM').replace(/ORDER BY.*$/, '')).get(...params.slice(0, -2))?.count || 0;

  return {
    logs: logs.map(l => ({ ...l, details: JSON.parse(l.details || '{}') })),
    total,
    limit,
    offset
  };
}

module.exports = { logAction, getLogs };
