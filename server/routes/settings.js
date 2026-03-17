const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Apply auth middleware
router.use(auth);

// GET all settings for user
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const rows = db.prepare('SELECT * FROM settings WHERE user_id = ?').all(userId);
    const settings = {};
    for (const row of rows) {
      // Strip the user_id suffix from the key to send back clean keys to frontend
      const cleanKey = row.key.replace(`_${userId}`, '');
      try {
        settings[cleanKey] = JSON.parse(row.value);
      } catch {
        settings[cleanKey] = row.value;
      }
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update settings for user
router.put('/', (req, res) => {
  const updates = req.body;
  const userId = req.user.id;
  
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, user_id, value) VALUES (?, ?, ?)');
  
  const updateMany = db.transaction((items) => {
    for (const [key, value] of Object.entries(items)) {
      const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // Append user_id to maintain global key uniqueness
      upsert.run(`${key}_${userId}`, userId, val);
    }
  });

  try {
    updateMany(updates);
    
    // Return updated settings
    const rows = db.prepare('SELECT * FROM settings WHERE user_id = ?').all(userId);
    const settings = {};
    for (const row of rows) {
      const cleanKey = row.key.replace(`_${userId}`, '');
      try {
        settings[cleanKey] = JSON.parse(row.value);
      } catch {
        settings[cleanKey] = row.value;
      }
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST onboarding answers
router.post('/onboarding', (req, res) => {
  try {
    const userId = req.user.id;
    const answers = req.body; // { goal, volume, industry }
    
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, user_id, value) VALUES (?, ?, ?)');
    
    db.transaction(() => {
      // Save specific onboarding settings if provided (they might be empty if skipped)
      if (answers && Object.keys(answers).length > 0) {
        for (const [key, value] of Object.entries(answers)) {
          upsert.run(`onboarding_${key}_${userId}`, userId, String(value));
        }
      }
      upsert.run(`onboardingCompleted_${userId}`, userId, 'true');
      
      // Update global user flag
      db.prepare('UPDATE users SET has_completed_onboarding = 1 WHERE id = ?').run(userId);
    })();

    res.json({ success: true });
  } catch (err) {
    console.error('Onboarding save error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
