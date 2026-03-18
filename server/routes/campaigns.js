const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const { logAction } = require('../services/auditLog');

// Helper: get user's active workspace_id
function getWorkspaceId(userId) {
  const user = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
  return user?.activeWorkspaceId || '';
}

router.use(auth);

// GET all campaigns
router.get('/', (req, res) => {
  try {
    const wsId = getWorkspaceId(req.user.id);
    const campaigns = db.prepare('SELECT * FROM campaigns WHERE user_id = ? AND workspace_id = ? ORDER BY createdAt DESC').all(req.user.id, wsId);
    const parsed = campaigns.map(c => ({
      ...c,
      sequence: JSON.parse(c.sequence || '[]'),
      stats: JSON.parse(c.stats || '{}'),
      leadIds: JSON.parse(c.leadIds || '[]'),
      schedule: JSON.parse(c.schedule || '{}'),
    }));
    res.json({ campaigns: parsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single campaign
router.get('/:id', (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    campaign.sequence = JSON.parse(campaign.sequence || '[]');
    campaign.stats = JSON.parse(campaign.stats || '{}');
    campaign.leadIds = JSON.parse(campaign.leadIds || '[]');
    campaign.schedule = JSON.parse(campaign.schedule || '{}');
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create campaign
router.post('/', (req, res) => {
  const { name, type, sequence, leadIds, schedule } = req.body;
  const id = uuidv4();
  const userId = req.user.id;
  const wsId = getWorkspaceId(userId);
  
  try {
    db.prepare(`
      INSERT INTO campaigns (id, user_id, workspace_id, name, type, sequence, leadIds, schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, wsId, name, type || 'linkedin', JSON.stringify(sequence || []), JSON.stringify(leadIds || []), JSON.stringify(schedule || {}));

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    campaign.sequence = JSON.parse(campaign.sequence);
    campaign.stats = JSON.parse(campaign.stats);
    campaign.leadIds = JSON.parse(campaign.leadIds);
    campaign.schedule = JSON.parse(campaign.schedule || '{}');
    logAction(req, 'campaign.created', 'campaign', id, name, { type: type || 'linkedin' });
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST enroll leads in campaign
router.post('/:id/enroll', (req, res) => {
  const { leadIds } = req.body; // Array of lead IDs
  const campaignId = req.params.id;
  const userId = req.user.id;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of leadIds' });
  }

  try {
    const campaign = db.prepare('SELECT id, leadIds FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, userId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const currentLeadIds = JSON.parse(campaign.leadIds || '[]');
    const newLeadIds = [...new Set([...currentLeadIds, ...leadIds])];

    // Begin Transaction to maintain consistency
    db.transaction(() => {
      // 1. Update the campaign.leadIds array
      db.prepare('UPDATE campaigns SET leadIds = ? WHERE id = ?').run(JSON.stringify(newLeadIds), campaignId);

      // 2. Insert into campaign_leads pipeline table
      const insertQueue = db.prepare(`
        INSERT OR IGNORE INTO campaign_leads (campaign_id, lead_id, user_id, status)
        VALUES (?, ?, ?, 'active')
      `);

      for (const leadId of leadIds) {
        insertQueue.run(campaignId, leadId, userId);
      }
    })();

    logAction(req, 'campaign.leads_enrolled', 'campaign', campaignId, '', { newLeads: leadIds.length, totalEnrolled: newLeadIds.length });
    res.json({ message: `Successfully enrolled leads.`, totalEnrolled: newLeadIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST verify all leads in a campaign (trigger enrichment via extension)
router.post('/:id/verify', (req, res) => {
  const campaignId = req.params.id;
  const userId = req.user.id;
  const { leadId, force } = req.body;

  try {
    const campaign = db.prepare('SELECT id, leadIds FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, userId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let leadIdsToVerify = [];
    if (leadId) {
      leadIdsToVerify = [leadId];
    } else {
      leadIdsToVerify = JSON.parse(campaign.leadIds || '[]');
    }

    if (leadIdsToVerify.length === 0) {
      return res.status(400).json({ error: 'No leads to verify' });
    }

    const verifier = require('../services/leadVerifier');
    verifier.enqueueLeads(leadIdsToVerify, userId, campaignId, { force: !!force });

    res.json({ message: `Verification started for ${leadIdsToVerify.length} leads`, queue: verifier.getStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET enrolled leads for a campaign with verification status
router.get('/:id/leads', (req, res) => {
  const campaignId = req.params.id;
  const userId = req.user.id;

  try {
    const campaign = db.prepare('SELECT id, leadIds FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, userId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const leadIds = JSON.parse(campaign.leadIds || '[]');
    if (leadIds.length === 0) {
      return res.json({ leads: [] });
    }

    const placeholders = leadIds.map(() => '?').join(',');
    const leads = db.prepare(`SELECT id, firstName, lastName, title, company, linkedinUrl, avatar, location, connectionDegree, verification_status, verified_at, isPremium FROM leads WHERE id IN (${placeholders}) AND user_id = ?`).all(...leadIds, userId);

    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update campaign
router.put('/:id', (req, res) => {
  const fields = { ...req.body };
  const userId = req.user.id;

  if (fields.sequence) fields.sequence = JSON.stringify(fields.sequence);
  if (fields.stats) fields.stats = JSON.stringify(fields.stats);
  if (fields.leadIds) fields.leadIds = JSON.stringify(fields.leadIds);
  if (fields.schedule) fields.schedule = JSON.stringify(fields.schedule);

  const updates = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);

  try {
    db.prepare(`UPDATE campaigns SET ${updates}, updatedAt = datetime('now') WHERE id = ? AND user_id = ?`).run(...values, req.params.id, userId);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if(campaign) {
      campaign.sequence = JSON.parse(campaign.sequence);
      campaign.stats = JSON.parse(campaign.stats);
      campaign.leadIds = JSON.parse(campaign.leadIds);
      campaign.schedule = JSON.parse(campaign.schedule || '{}');
    }
    logAction(req, 'campaign.updated', 'campaign', req.params.id, campaign?.name || '', { fields: Object.keys(req.body) });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE campaign
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  try {
    const camp = db.prepare('SELECT name FROM campaigns WHERE id = ? AND user_id = ?').get(req.params.id, userId);
    db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    logAction(req, 'campaign.deleted', 'campaign', req.params.id, camp?.name || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET campaign pipeline — lead-by-lead step tracking
router.get('/:id/pipeline', (req, res) => {
  const campaignId = req.params.id;
  const userId = req.user.id;

  try {
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, userId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const pipeline = db.prepare(`
      SELECT cl.lead_id, cl.current_step_index, cl.current_node_id, cl.next_execution_at,
             cl.status, cl.error_message,
             l.firstName, l.lastName, l.title, l.company, l.avatar, l.linkedinUrl
      FROM campaign_leads cl
      JOIN leads l ON cl.lead_id = l.id
      WHERE cl.campaign_id = ? AND cl.user_id = ?
      ORDER BY cl.status ASC, l.firstName ASC
    `).all(campaignId, userId);

    res.json({ pipeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST unenroll leads from campaign
router.post('/:id/unenroll', (req, res) => {
  const { leadIds } = req.body;
  const campaignId = req.params.id;
  const userId = req.user.id;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of leadIds' });
  }

  try {
    const campaign = db.prepare('SELECT id, leadIds FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, userId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    db.transaction(() => {
      // Remove from campaign_leads pipeline
      const deleteStmt = db.prepare('DELETE FROM campaign_leads WHERE campaign_id = ? AND lead_id = ? AND user_id = ?');
      for (const lid of leadIds) {
        deleteStmt.run(campaignId, lid, userId);
      }

      // Update campaigns.leadIds array
      const currentLeadIds = JSON.parse(campaign.leadIds || '[]');
      const updatedLeadIds = currentLeadIds.filter(id => !leadIds.includes(id));
      db.prepare('UPDATE campaigns SET leadIds = ? WHERE id = ?').run(JSON.stringify(updatedLeadIds), campaignId);
    })();

    res.json({ message: `Unenrolled ${leadIds.length} lead(s)` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST duplicate campaign
router.post('/:id/duplicate', (req, res) => {
  const campaignId = req.params.id;
  const userId = req.user.id;

  try {
    const original = db.prepare('SELECT * FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, userId);
    if (!original) return res.status(404).json({ error: 'Campaign not found' });

    const newId = require('uuid').v4();
    const newName = `${original.name} (Copy)`;

    db.prepare(`
      INSERT INTO campaigns (id, user_id, name, type, sequence, leadIds, schedule, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(newId, userId, newName, original.type, original.sequence, '[]', original.schedule);

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(newId);
    campaign.sequence = JSON.parse(campaign.sequence || '[]');
    campaign.stats = JSON.parse(campaign.stats || '{}');
    campaign.leadIds = JSON.parse(campaign.leadIds || '[]');
    campaign.schedule = JSON.parse(campaign.schedule || '{}');

    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET campaign stats — real-time computed
router.get('/:id/stats', (req, res) => {
  const campaignId = req.params.id;
  const userId = req.user.id;

  try {
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND user_id = ?').get(campaignId, userId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Pipeline status counts
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM campaign_leads
      WHERE campaign_id = ? AND user_id = ?
      GROUP BY status
    `).all(campaignId, userId);

    const counts = { active: 0, completed: 0, error: 0, paused: 0, total: 0 };
    statusCounts.forEach(row => {
      counts[row.status] = row.count;
      counts.total += row.count;
    });

    // Activity counts for this campaign
    const activityCounts = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM activities
      WHERE campaignId = ? AND user_id = ?
      GROUP BY type
    `).all(campaignId, userId);

    const activities = {};
    activityCounts.forEach(row => { activities[row.type] = row.count; });

    // Node distribution — how many leads at each node
    const nodeDistribution = db.prepare(`
      SELECT current_node_id, COUNT(*) as count
      FROM campaign_leads
      WHERE campaign_id = ? AND user_id = ? AND status = 'active'
      GROUP BY current_node_id
    `).all(campaignId, userId);

    const nodeLeadCounts = {};
    nodeDistribution.forEach(row => { nodeLeadCounts[row.current_node_id || 'queued'] = row.count; });

    res.json({ counts, activities, nodeLeadCounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

