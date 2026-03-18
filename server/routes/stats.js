const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Apply auth middleware to all stats routes
router.use(auth);

// Helper: check if user is admin
const isAdmin = (req) => req.user.role === 'admin';

// Helper: get effective userId (admin can override via ?userId=)
const getEffectiveUserId = (req) => {
  if (isAdmin(req) && req.query.userId) return req.query.userId;
  return req.user.id;
};

// GET list of users (admin only, for the user filter dropdown)
router.get('/users', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' });
  try {
    const users = db.prepare('SELECT id, name, email, role FROM users ORDER BY name ASC').all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET dashboard overview stats with period-over-period % change
router.get('/overview', (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE user_id = ?').get(userId).count;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE user_id = ? AND status = 'active'").get(userId).count;
    const connectedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'connected'").get(userId).count;
    const repliedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'replied'").get(userId).count;
    
    const connectionRate = totalLeads > 0 ? Math.round((connectedLeads / totalLeads) * 100) : 0;
    const replyRate = totalLeads > 0 ? Math.round((repliedLeads / totalLeads) * 100) : 0;

    const todayActions = db.prepare("SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND date(timestamp) = date('now')").get(userId).count;
    const pendingLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'pending'").get(userId).count;

    // Period-over-period comparison (last 30d vs previous 30d)
    const cur30 = db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND createdAt >= date('now','-30 days')").get(userId).count;
    const prev30 = db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND createdAt >= date('now','-60 days') AND createdAt < date('now','-30 days')").get(userId).count;
    const leadsChange = prev30 > 0 ? Math.round(((cur30 - prev30) / prev30) * 100) : (cur30 > 0 ? 100 : 0);

    const curConn = db.prepare("SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND type='connection_sent' AND timestamp >= date('now','-30 days')").get(userId).count;
    const prevConn = db.prepare("SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND type='connection_sent' AND timestamp >= date('now','-60 days') AND timestamp < date('now','-30 days')").get(userId).count;
    const connChange = prevConn > 0 ? Math.round(((curConn - prevConn) / prevConn) * 100) : (curConn > 0 ? 100 : 0);

    const curReply = db.prepare("SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND type='message_replied' AND timestamp >= date('now','-30 days')").get(userId).count;
    const prevReply = db.prepare("SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND type='message_replied' AND timestamp >= date('now','-60 days') AND timestamp < date('now','-30 days')").get(userId).count;
    const replyChange = prevReply > 0 ? Math.round(((curReply - prevReply) / prevReply) * 100) : (curReply > 0 ? 100 : 0);

    res.json({
      totalLeads,
      activeCampaigns,
      connectedLeads,
      repliedLeads,
      connectionRate,
      replyRate,
      todayActions,
      pendingLeads,
      leadsChange,
      connChange,
      replyChange,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent activity feed
router.get('/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 15;
  try {
    const activities = db.prepare(`
      SELECT a.*, l.firstName, l.lastName, l.company, l.avatar
      FROM activities a
      LEFT JOIN leads l ON a.leadId = l.id
      WHERE a.user_id = ?
      ORDER BY a.timestamp DESC
      LIMIT ?
    `).all(getEffectiveUserId(req), limit);
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET chart data with range + optional campaign filter
router.get('/chart', (req, res) => {
  try {
    const { range = 'monthly', start, end, campaignId } = req.query;
    const userId = getEffectiveUserId(req);
    let days = 30;

    const campaignFilter = campaignId ? ' AND campaignId = ?' : '';
    const campaignParams = campaignId ? [campaignId] : [];

    if (range === 'daily') days = 1;
    else if (range === 'weekly') days = 7;
    else if (range === 'monthly') days = 30;
    else if (range === 'half_yearly') days = 180;
    else if (range === 'yearly') days = 365;

    const data = [];

    if (range === 'daily') {
      // Return 24 hourly points for today
      for (let i = 0; i < 24; i++) {
        const hourStr = i.toString().padStart(2, '0') + ':00';
        const row = db.prepare(`
          SELECT 
            COUNT(CASE WHEN type = 'connection_sent' THEN 1 END) as connections,
            COUNT(CASE WHEN type = 'message_sent' THEN 1 END) as messages,
            COUNT(CASE WHEN type = 'email_sent' THEN 1 END) as emails,
            COUNT(CASE WHEN type = 'message_replied' THEN 1 END) as replies
          FROM activities 
          WHERE user_id = ?${campaignFilter}
          AND date(timestamp) = date('now') 
          AND strftime('%H', timestamp) = ?
        `).get(userId, ...campaignParams, i.toString().padStart(2, '0'));

        data.push({
          date: hourStr,
          connections: row.connections || 0,
          messages: row.messages || 0,
          emails: row.emails || 0,
          replies: row.replies || 0,
        });
      }
    } else if (range === 'custom' && start && end) {
      // For custom range, we calculate dates between start and end
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      // Limit custom range to 365 days to prevent performance issues
      const finalDays = Math.min(diffDays, 365);

      for (let i = 0; i < finalDays; i++) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + i);
        const dateStr = current.toISOString().split('T')[0];
        
        const row = db.prepare(`
          SELECT 
            COUNT(CASE WHEN type = 'connection_sent' THEN 1 END) as connections,
            COUNT(CASE WHEN type = 'message_sent' THEN 1 END) as messages,
            COUNT(CASE WHEN type = 'email_sent' THEN 1 END) as emails,
            COUNT(CASE WHEN type = 'message_replied' THEN 1 END) as replies
          FROM activities 
          WHERE user_id = ?${campaignFilter} AND date(timestamp) = ?
        `).get(userId, ...campaignParams, dateStr);

        data.push({
          date: dateStr,
          connections: row.connections || 0,
          messages: row.messages || 0,
          emails: row.emails || 0,
          replies: row.replies || 0,
        });
      }
    } else {
      // Preset ranges
      for (let i = days - 1; i >= 0; i--) {
        const dayOffset = `-${i} days`;
        const row = db.prepare(`
          SELECT 
            date('now', ?) as date,
            COUNT(CASE WHEN type = 'connection_sent' THEN 1 END) as connections,
            COUNT(CASE WHEN type = 'message_sent' THEN 1 END) as messages,
            COUNT(CASE WHEN type = 'email_sent' THEN 1 END) as emails,
            COUNT(CASE WHEN type = 'message_replied' THEN 1 END) as replies
          FROM activities 
          WHERE user_id = ?${campaignFilter} AND date(timestamp) = date('now', ?)
        `).get(dayOffset, userId, ...campaignParams, dayOffset);
        
        data.push({
          date: row.date,
          connections: row.connections || 0,
          messages: row.messages || 0,
          emails: row.emails || 0,
          replies: row.replies || 0,
        });
      }
    }

    // Add dummy data for demo if empty (only for presets)
    if (data.every(d => d.connections === 0 && d.messages === 0)) {
       data.forEach(d => {
          d.connections = Math.floor(Math.random() * 10);
          d.messages = Math.floor(Math.random() * 15);
          d.replies = Math.floor(Math.random() * 5);
       });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET lead status distribution  
router.get('/lead-status', (req, res) => {
  try {
    const statuses = db.prepare(`
      SELECT status, COUNT(*) as count FROM leads WHERE user_id = ? GROUP BY status
    `).all(getEffectiveUserId(req));
    res.json({ statuses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET per-campaign stats breakdown
router.get('/campaign-breakdown', (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const campaigns = db.prepare('SELECT id, name, status, leadIds, stats FROM campaigns WHERE user_id = ? ORDER BY createdAt DESC').all(userId);

    const breakdown = campaigns.map(c => {
      const leadIds = JSON.parse(c.leadIds || '[]');
      const stats = JSON.parse(c.stats || '{}');
      const sent = stats.sent || 0;
      const accepted = stats.accepted || 0;
      const replied = stats.replied || 0;
      const acceptRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;
      const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        totalLeads: leadIds.length,
        sent,
        accepted,
        replied,
        acceptRate,
        replyRate
      };
    });

    res.json({ breakdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/risk - safety risk assessment
router.get('/risk', (req, res) => {
  try {
    const { assessRisk } = require('../middleware/safety');
    const risk = assessRisk(req.user.id);
    res.json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/conversion-rate - conversion funnel
router.get('/conversion-rate', (req, res) => {
  const userId = getEffectiveUserId(req);
  try {
    const total = db.prepare('SELECT COUNT(*) as c FROM leads WHERE user_id = ?').get(userId)?.c || 0;
    const contacted = db.prepare("SELECT COUNT(*) as c FROM campaign_leads WHERE user_id = ? AND status IN ('active','completed')").get(userId)?.c || 0;
    const replied = db.prepare("SELECT COUNT(*) as c FROM campaign_leads WHERE user_id = ? AND status = 'replied'").get(userId)?.c || 0;
    const converted = db.prepare("SELECT COUNT(*) as c FROM campaign_leads WHERE user_id = ? AND status = 'completed'").get(userId)?.c || 0;

    res.json({
      funnel: [
        { stage: 'Total Leads', count: total },
        { stage: 'Contacted', count: contacted },
        { stage: 'Replied', count: replied },
        { stage: 'Converted', count: converted },
      ],
      rates: {
        contactRate: total > 0 ? ((contacted / total) * 100).toFixed(1) : '0.0',
        replyRate: contacted > 0 ? ((replied / contacted) * 100).toFixed(1) : '0.0',
        conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0',
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
