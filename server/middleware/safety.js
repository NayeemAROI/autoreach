// Safety system: risk detection + activity throttling
const db = require('../db/database');
const logger = require('../utils/logger');

const RISK_THRESHOLDS = {
  // Actions per time window
  actionsPerHour: 30,
  actionsPerDay: 150,
  connectionsPerDay: 50,
  messagesPerDay: 100,
  // Velocity flags
  rapidFireWindowMs: 5000, // Less than 5s between actions = suspicious
};

// Check if user is at risk of LinkedIn detection
function assessRisk(userId) {
  const flags = [];
  const now = new Date();

  // Count actions in last hour
  const hourAgo = new Date(now - 3600000).toISOString();
  const hourActions = db.prepare("SELECT COUNT(*) as c FROM activities WHERE user_id = ? AND timestamp > ?").get(userId, hourAgo)?.c || 0;
  if (hourActions > RISK_THRESHOLDS.actionsPerHour) {
    flags.push({ level: 'high', reason: `${hourActions} actions in last hour (limit: ${RISK_THRESHOLDS.actionsPerHour})` });
  }

  // Count actions today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const dayActions = db.prepare("SELECT COUNT(*) as c FROM activities WHERE user_id = ? AND timestamp > ?").get(userId, todayStart)?.c || 0;
  if (dayActions > RISK_THRESHOLDS.actionsPerDay) {
    flags.push({ level: 'critical', reason: `${dayActions} actions today (limit: ${RISK_THRESHOLDS.actionsPerDay})` });
  }

  // Check for rapid-fire (less than 5s between consecutive actions)
  const recentActions = db.prepare("SELECT timestamp FROM activities WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5").all(userId);
  for (let i = 0; i < recentActions.length - 1; i++) {
    const diff = new Date(recentActions[i].timestamp) - new Date(recentActions[i + 1].timestamp);
    if (diff < RISK_THRESHOLDS.rapidFireWindowMs) {
      flags.push({ level: 'warning', reason: `Rapid-fire detected: ${diff}ms between actions` });
      break;
    }
  }

  // Count connections today
  const dayConnections = db.prepare("SELECT COUNT(*) as c FROM activities WHERE user_id = ? AND timestamp > ? AND type IN ('send_invite','connect')").get(userId, todayStart)?.c || 0;
  if (dayConnections > RISK_THRESHOLDS.connectionsPerDay) {
    flags.push({ level: 'high', reason: `${dayConnections} connections today (limit: ${RISK_THRESHOLDS.connectionsPerDay})` });
  }

  const riskLevel = flags.some(f => f.level === 'critical') ? 'critical'
    : flags.some(f => f.level === 'high') ? 'high'
    : flags.some(f => f.level === 'warning') ? 'warning' : 'safe';

  return { riskLevel, flags, stats: { hourActions, dayActions, dayConnections } };
}

// Middleware: throttle if risk is too high
function safetyThrottle(req, res, next) {
  const risk = assessRisk(req.user.id);

  if (risk.riskLevel === 'critical') {
    logger.warn(`🛡️ CRITICAL risk for user ${req.user.id} — throttling`, { flags: risk.flags });
    return res.status(429).json({
      error: 'Safety limit reached',
      message: 'Too many actions today. LinkedIn may flag your account. Please wait until tomorrow.',
      risk
    });
  }

  // Attach risk info to request for downstream use
  req.riskAssessment = risk;
  next();
}

module.exports = { assessRisk, safetyThrottle, RISK_THRESHOLDS };
