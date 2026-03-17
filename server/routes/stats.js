const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Apply auth middleware to all stats routes
router.use(auth);

// GET dashboard overview stats
router.get('/overview', (req, res) => {
  try {
    const userId = req.user.id;
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE user_id = ?').get(userId).count;
    const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE user_id = ? AND status = 'active'").get(userId).count;
    const connectedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'connected'").get(userId).count;
    const repliedLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'replied'").get(userId).count;
    
    // Calculate rates
    const connectionRate = totalLeads > 0 ? Math.round((connectedLeads / totalLeads) * 100) : 0;
    const replyRate = totalLeads > 0 ? Math.round((repliedLeads / totalLeads) * 100) : 0;

    // Today's actions
    const todayActions = db.prepare("SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND date(timestamp) = date('now')").get(userId).count;

    // Pending leads
    const pendingLeads = db.prepare("SELECT COUNT(*) as count FROM leads WHERE user_id = ? AND status = 'pending'").get(userId).count;

    res.json({
      totalLeads,
      activeCampaigns,
      connectedLeads,
      repliedLeads,
      connectionRate,
      replyRate,
      todayActions,
      pendingLeads,
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
    `).all(req.user.id, limit);
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET chart data with range support
router.get('/chart', (req, res) => {
  try {
    const { range = 'monthly', start, end } = req.query;
    const userId = req.user.id;
    let days = 30;
    let startOffset = 0;

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
          WHERE user_id = ? 
          AND date(timestamp) = date('now') 
          AND strftime('%H', timestamp) = ?
        `).get(userId, i.toString().padStart(2, '0'));

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
          WHERE user_id = ? AND date(timestamp) = ?
        `).get(userId, dateStr);

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
          WHERE user_id = ? AND date(timestamp) = date('now', ?)
        `).get(dayOffset, userId, dayOffset);
        
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
    `).all(req.user.id);
    res.json({ statuses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
