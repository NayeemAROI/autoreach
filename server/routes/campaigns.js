const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');

router.use(auth);

// GET all campaigns
router.get('/', (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM campaigns WHERE user_id = ? ORDER BY createdAt DESC').all(req.user.id);
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
  
  try {
    db.prepare(`
      INSERT INTO campaigns (id, user_id, name, type, sequence, leadIds, schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, type || 'linkedin', JSON.stringify(sequence || []), JSON.stringify(leadIds || []), JSON.stringify(schedule || {}));

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    campaign.sequence = JSON.parse(campaign.sequence);
    campaign.stats = JSON.parse(campaign.stats);
    campaign.leadIds = JSON.parse(campaign.leadIds);
    campaign.schedule = JSON.parse(campaign.schedule || '{}');
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
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE campaign
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  try {
    db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
