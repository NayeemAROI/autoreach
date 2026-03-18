const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const linkedinApi = require('../services/linkedinApi');
const { logAction } = require('../services/auditLog');

// GET /api/integrations/status - Check LinkedIn connection status
router.get('/status', authenticate, (req, res) => {
  try {
    const cookie = linkedinApi.getCookie(req.user.id);
    
    if (cookie && cookie.valid) {
      res.json({
        connected: true,
        connectedAt: cookie.connectedAt,
        profileName: cookie.profileName || 'LinkedIn Profile',
        profileUrl: cookie.profileUrl || '',
        method: 'cookie'
      });
    } else {
      res.json({
        connected: false,
        connectedAt: null,
        profileName: '',
        profileUrl: '',
        method: null
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/connect-cookie - Save & validate a li_at cookie
router.post('/connect-cookie', authenticate, async (req, res) => {
  try {
    const { li_at } = req.body;
    if (!li_at || typeof li_at !== 'string' || li_at.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a valid li_at cookie value.' });
    }

    const trimmed = li_at.trim();
    console.log(`[Integrations] Validating LinkedIn cookie for user ${req.user.id}...`);
    
    const result = await linkedinApi.validateCookie(trimmed);
    
    if (!result.valid) {
      return res.status(400).json({ error: result.error || 'Cookie validation failed.' });
    }

    // Save to DB (including memberId needed for messaging API)
    linkedinApi.saveCookie(req.user.id, trimmed, result.csrf, result.profileName, result.profileUrl, result.memberId);
    console.log(`[Integrations] LinkedIn connected for ${result.profileName}`);
    
    logAction(req, 'integration.linkedin_connected', 'integration', '', result.profileName, { profileUrl: result.profileUrl });
    res.json({
      success: true,
      profileName: result.profileName,
      profileUrl: result.profileUrl,
      message: `Connected as ${result.profileName}!`
    });
  } catch (err) {
    console.error('[Integrations] Cookie connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/disconnect - Remove stored cookie
router.post('/disconnect', authenticate, (req, res) => {
  try {
    linkedinApi.disconnectCookie(req.user.id);
    logAction(req, 'integration.linkedin_disconnected', 'integration');
    res.json({ success: true, message: 'LinkedIn disconnected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/sync-inbox - Trigger server-side inbox sync
router.post('/sync-inbox', authenticate, async (req, res) => {
  try {
    console.log(`[Integrations] Starting inbox sync for user ${req.user.id}...`);
    const result = await linkedinApi.syncInbox(req.user.id);
    logAction(req, 'integration.inbox_synced', 'integration', '', '', { messages: result.messages, conversations: result.conversations });
    res.json({
      success: true,
      message: `Synced ${result.messages} messages across ${result.conversations} new conversations.`,
      ...result
    });
  } catch (err) {
    console.error('[Integrations] Sync error:', err.message);
    const status = err.message.includes('expired') || err.message.includes('reconnect') ? 401 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
