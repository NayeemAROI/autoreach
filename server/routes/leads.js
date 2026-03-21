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

// Apply auth middleware
router.use(auth);

// GET all leads with optional filters
router.get('/', (req, res) => {
  const { search, status, verification_status, tag, campaign, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const userId = req.user.id;
  const wsId = getWorkspaceId(userId);
  
  let query = `
    SELECT 
      l.*,
      COALESCE(cl.status, l.status, 'not_invited') as status,
      c.name as campaignName 
    FROM leads l
    LEFT JOIN campaign_leads cl ON l.id = cl.lead_id
    LEFT JOIN campaigns c ON cl.campaign_id = c.id
    WHERE l.user_id = ? AND l.workspace_id = ?
  `;
  const params = [userId, wsId];

  if (search) {
    query += ' AND (l.firstName LIKE ? OR l.lastName LIKE ? OR l.company LIKE ? OR l.email LIKE ? OR l.title LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  if (status && status !== 'all') {
    if (status === 'not_invited') {
      query += ` AND (cl.status = 'not_invited' OR cl.status IS NULL OR (cl.status IS NULL AND l.status IS NULL))`;
    } else {
      query += ' AND cl.status = ?';
      params.push(status);
    }
  }

  if (verification_status && verification_status !== 'all') {
    query += ' AND l.verification_status = ?';
    params.push(verification_status);
  }

  if (tag) {
    query += ' AND l.tags LIKE ?';
    params.push(`%${tag}%`);
  }

  if (campaign && campaign !== 'all') {
    query += ' AND cl.campaign_id = ?';
    params.push(campaign);
  }

  if (dateFrom) {
    query += ' AND l.createdAt >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND l.createdAt <= ?';
    params.push(dateTo);
  }

  const validSortColumns = ['createdAt', 'firstName', 'company', 'status'];
  const col = validSortColumns.includes(sortBy) ? `l.${sortBy}` : 'l.createdAt';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${col} ${order}`;

  try {
    const leads = db.prepare(query).all(...params);
    // Parse tags JSON
    const parsed = leads.map(l => ({ ...l, tags: JSON.parse(l.tags || '[]') }));
    res.json({ leads: parsed, total: parsed.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all unique tags for this user (must be before /:id)
router.get('/meta/tags', (req, res) => {
  try {
    const leads = db.prepare('SELECT tags FROM leads WHERE user_id = ?').all(req.user.id);
    const tagSet = new Set();
    leads.forEach(l => {
      try { JSON.parse(l.tags || '[]').forEach(t => tagSet.add(t)); } catch {}
    });
    res.json({ tags: [...tagSet].sort() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single lead
router.get('/:id', (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    lead.tags = JSON.parse(lead.tags || '[]');
    
    // Get activities for this lead
    const activities = db.prepare('SELECT * FROM activities WHERE leadId = ? AND user_id = ? ORDER BY timestamp DESC LIMIT 20').all(req.params.id, req.user.id);
    
    // Get notes
    const notes = db.prepare('SELECT n.*, u.name as authorName FROM lead_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.lead_id = ? ORDER BY n.createdAt DESC').all(req.params.id);

    res.json({ lead, activities, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create lead
router.post('/', (req, res) => {
  const { firstName, lastName, title, company, linkedinUrl, email, phone, tags, source } = req.body;
  const id = uuidv4();
  const userId = req.user.id;
  const wsId = getWorkspaceId(userId);
  
  try {
    db.prepare(`
      INSERT INTO leads (id, user_id, workspace_id, firstName, lastName, title, company, linkedinUrl, email, phone, tags, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, wsId, firstName, lastName, title || '', company || '', linkedinUrl || '', email || '', phone || '', JSON.stringify(tags || []), source || 'manual');
    
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
    lead.tags = JSON.parse(lead.tags || '[]');
    logAction(req, 'lead.created', 'lead', id, `${firstName} ${lastName}`, { company, source: source || 'manual' });
    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk import
router.post('/import', (req, res) => {
  const { leads } = req.body;
  const userId = req.user.id;
  const wsId = getWorkspaceId(userId);

  if (!Array.isArray(leads)) return res.status(400).json({ error: 'leads must be an array' });

  const insert = db.prepare(`
    INSERT INTO leads (id, user_id, workspace_id, firstName, lastName, title, company, linkedinUrl, email, phone, tags, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const checkExisting = db.prepare(`
    SELECT id FROM leads 
    WHERE user_id = ? AND firstName = ? AND lastName = ? AND company = ?
  `);

  const insertMany = db.transaction((items) => {
    let importedCount = 0;
    let skippedCount = 0;

    for (const l of items) {
      // Check for exact duplicates
      const existing = checkExisting.get(userId, l.firstName, l.lastName, l.company || '');
      if (existing) {
        skippedCount++;
        continue;
      }

      insert.run(uuidv4(), userId, wsId, l.firstName, l.lastName, l.title || '', l.company || '', l.linkedinUrl || '', l.email || '', l.phone || '', JSON.stringify(l.tags || []), 'csv_import');
      importedCount++;
    }
    return { importedCount, skippedCount };
  });

  try {
    const { importedCount, skippedCount } = insertMany(leads);
    logAction(req, 'lead.bulk_import', 'lead', '', '', { imported: importedCount, skipped: skippedCount, total: leads.length });
    res.json({ imported: importedCount, skipped: skippedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST import leads from LinkedIn profile URLs
router.post('/import-urls', (req, res) => {
  const { urls } = req.body; // Array of LinkedIn profile URL strings
  const userId = req.user.id;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls must be a non-empty array of LinkedIn profile URLs' });
  }

  const insert = db.prepare(`
    INSERT INTO leads (id, user_id, firstName, lastName, title, company, linkedinUrl, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const importUrls = db.transaction((profileUrls) => {
    const created = [];
    for (const url of profileUrls) {
      const trimmed = url.trim();
      if (!trimmed) continue;

      // Check if already exists for this user
      const existing = db.prepare('SELECT id FROM leads WHERE linkedinUrl = ? AND user_id = ?').get(trimmed, userId);
      if (existing) {
        created.push(existing.id);
        continue;
      }

      // Extract name from URL slug (best effort)
      let firstName = 'LinkedIn';
      let lastName = 'Profile';
      try {
        const match = trimmed.match(/\/in\/([^/?]+)/);
        if (match) {
          const slug = match[1].replace(/-/g, ' ').split(' ');
          firstName = slug[0] ? slug[0].charAt(0).toUpperCase() + slug[0].slice(1) : 'LinkedIn';
          lastName = slug.length > 1 ? slug[slug.length - 1].charAt(0).toUpperCase() + slug[slug.length - 1].slice(1) : 'Profile';
        }
      } catch {}

      const id = require('uuid').v4();
      insert.run(id, userId, firstName, lastName, '', '', trimmed, 'campaign_import');
      created.push(id);
    }
    return created;
  });

  try {
    const leadIds = importUrls(urls);
    res.json({ imported: leadIds.length, leadIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update lead
router.put('/:id', (req, res) => {
  const fields = req.body;
  const userId = req.user.id;

  if (fields.tags) fields.tags = JSON.stringify(fields.tags);
  
  const updates = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);

  try {
    db.prepare(`UPDATE leads SET ${updates}, updatedAt = datetime('now') WHERE id = ? AND user_id = ?`).run(...values, req.params.id, userId);
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if(lead) lead.tags = JSON.parse(lead.tags || '[]');
    res.json(lead);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE lead
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  try {
    db.prepare('DELETE FROM activities WHERE leadId = ? AND user_id = ?').run(req.params.id, userId);
    try { db.prepare('DELETE FROM campaign_leads WHERE lead_id = ? AND user_id = ?').run(req.params.id, userId); } catch(e){}
    db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk delete leads
router.post('/bulk-delete', (req, res) => {
  const { leadIds } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds must be a non-empty array' });
  }

  const deleteActivities = db.prepare('DELETE FROM activities WHERE leadId = ? AND user_id = ?');
  const deleteCampLeads = db.prepare('DELETE FROM campaign_leads WHERE lead_id = ? AND user_id = ?');
  const deleteLeads = db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?');

  const performBulkDelete = db.transaction((ids) => {
    for (const id of ids) {
      deleteActivities.run(id, userId);
      try { deleteCampLeads.run(id, userId); } catch(e){}
      deleteLeads.run(id, userId);
    }
  });

  try {
    performBulkDelete(leadIds);
    res.json({ success: true, count: leadIds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST verify/reverify a single lead
router.post('/:id/verify', (req, res) => {
  const leadId = req.params.id;
  const userId = req.user.id;
  const { force } = req.body || {};

  try {
    const lead = db.prepare('SELECT id FROM leads WHERE id = ? AND user_id = ?').get(leadId, userId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const verifier = require('../services/leadVerifier');
    verifier.enqueueLeads([leadId], userId, null, { force: !!force });

    res.json({ message: 'Verification started', leadId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST enrich lead from LinkedIn profile via Unipile
router.post('/:id/enrich', async (req, res) => {
  const leadId = req.params.id;
  const userId = req.user.id;

  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(leadId, userId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.linkedinUrl) return res.status(400).json({ error: 'Lead has no LinkedIn URL' });

    const unipile = require('../services/unipileApi');
    const profile = await unipile.getUserFullProfile(lead.linkedinUrl);

    // Update lead with enriched data
    db.prepare(`
      UPDATE leads SET 
        firstName = COALESCE(NULLIF(?, ''), firstName),
        lastName = COALESCE(NULLIF(?, ''), lastName),
        company = COALESCE(NULLIF(?, ''), company),
        title = COALESCE(NULLIF(?, ''), title),
        updatedAt = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(profile.firstName, profile.lastName, profile.company, profile.title, leadId, userId);

    const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
    updated.tags = JSON.parse(updated.tags || '[]');
    res.json({ success: true, lead: updated, enrichedProfile: profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ─── Notes CRUD ───

// GET notes for a lead
router.get('/:id/notes', (req, res) => {
  try {
    const notes = db.prepare(`
      SELECT n.*, u.name as authorName 
      FROM lead_notes n 
      LEFT JOIN users u ON n.user_id = u.id 
      WHERE n.lead_id = ? 
      ORDER BY n.createdAt DESC
    `).all(req.params.id);
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add note to lead
router.post('/:id/notes', (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Note content required' });

  try {
    const id = uuidv4();
    db.prepare('INSERT INTO lead_notes (id, lead_id, user_id, content) VALUES (?, ?, ?, ?)').run(id, req.params.id, req.user.id, content.trim());
    const note = db.prepare('SELECT n.*, u.name as authorName FROM lead_notes n LEFT JOIN users u ON n.user_id = u.id WHERE n.id = ?').get(id);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE note
router.delete('/:leadId/notes/:noteId', (req, res) => {
  try {
    db.prepare('DELETE FROM lead_notes WHERE id = ? AND (user_id = ? OR ? IN (SELECT id FROM users WHERE role = "owner"))').run(req.params.noteId, req.user.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tag Management ───

// POST add tag to lead
router.post('/:id/tags', (req, res) => {
  const { tag } = req.body;
  if (!tag?.trim()) return res.status(400).json({ error: 'Tag required' });

  try {
    const lead = db.prepare('SELECT tags FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    const tags = JSON.parse(lead.tags || '[]');
    const newTag = tag.trim().toLowerCase();
    if (!tags.includes(newTag)) {
      tags.push(newTag);
      db.prepare('UPDATE leads SET tags = ? WHERE id = ?').run(JSON.stringify(tags), req.params.id);
    }
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE tag from lead
router.delete('/:id/tags/:tag', (req, res) => {
  try {
    const lead = db.prepare('SELECT tags FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    let tags = JSON.parse(lead.tags || '[]');
    tags = tags.filter(t => t !== req.params.tag);
    db.prepare('UPDATE leads SET tags = ? WHERE id = ?').run(JSON.stringify(tags), req.params.id);
    res.json({ tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
