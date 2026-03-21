const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const linkedinApi = require('../services/linkedinApi');
const { logAction } = require('../services/auditLog');

// GET /api/integrations/status - Check LinkedIn connection status (Unipile + cookie fallback)
router.get('/status', authenticate, async (req, res) => {
  try {
    // Check Unipile first
    const unipile = require('../services/unipileApi');
    const configured = await unipile.isConfigured();
    
    if (configured) {
      const health = await unipile.healthCheck();
      if (health.ok) {
        return res.json({
          connected: true,
          connectedAt: new Date().toISOString(),
          profileName: health.name || 'LinkedIn Profile',
          profileUrl: '',
          method: 'unipile',
          accountId: health.accountId
        });
      }
    }

    // Fallback: check stored cookie
    const cookie = linkedinApi.getCookie(req.user.id);
    if (cookie && cookie.valid) {
      return res.json({
        connected: true,
        connectedAt: cookie.connectedAt,
        profileName: cookie.profileName || 'LinkedIn Profile',
        profileUrl: cookie.profileUrl || '',
        method: 'cookie'
      });
    }

    res.json({
      connected: false,
      connectedAt: null,
      profileName: '',
      profileUrl: '',
      method: null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/connect-linkedin - Login with LinkedIn credentials via Unipile
router.post('/connect-linkedin', authenticate, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const unipile = require('../services/unipileApi');
    console.log(`[Integrations] Connecting LinkedIn for user ${req.user.id} via Unipile...`);
    
    const result = await unipile.connectLinkedIn(username, password);

    if (result.checkpoint) {
      // 2FA/OTP required
      return res.json({
        checkpoint: true,
        accountId: result.accountId,
        type: result.type,
        message: result.message,
      });
    }

    // Success
    logAction(req, 'integration.linkedin_connected', 'integration', '', result.name);
    res.json({
      success: true,
      profileName: result.name,
      accountId: result.accountId,
      message: `Connected as ${result.name}!`
    });
  } catch (err) {
    console.error('[Integrations] LinkedIn connect error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/integrations/solve-checkpoint - Submit 2FA/OTP code
router.post('/solve-checkpoint', authenticate, async (req, res) => {
  try {
    const { accountId, code } = req.body;
    if (!accountId || !code) {
      return res.status(400).json({ error: 'Account ID and verification code are required.' });
    }

    const unipile = require('../services/unipileApi');
    console.log(`[Integrations] Solving checkpoint for account ${accountId}...`);
    
    const result = await unipile.solveCheckpoint(accountId, code);

    if (result.checkpoint) {
      // Another checkpoint needed
      return res.json({
        checkpoint: true,
        type: result.type,
        message: result.message,
      });
    }

    logAction(req, 'integration.linkedin_connected', 'integration', '', 'LinkedIn');
    res.json({
      success: true,
      accountId: result.accountId,
      message: 'LinkedIn connected successfully!'
    });
  } catch (err) {
    console.error('[Integrations] Checkpoint error:', err.message);
    res.status(400).json({ error: err.message });
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

    // Prevent same LinkedIn profile from being connected to multiple workspaces
    if (result.memberId) {
      const db = require('../db/database');
      const wsId = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(req.user.id)?.activeWorkspaceId || '';
      const existing = db.prepare(`
        SELECT w.id, w.name FROM workspaces w
        WHERE w.linkedin_member_id = ? AND w.id != ? AND w.linkedin_cookie_valid = 1
      `).get(result.memberId, wsId);
      
      if (existing) {
        return res.status(409).json({ 
          error: `This LinkedIn profile (${result.profileName}) is already connected to workspace "${existing.name}". Disconnect it there first.` 
        });
      }
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
    // Use 502 (not 401!) for LinkedIn session issues — 401 triggers frontend logout
    const status = err.message.includes('expired') || err.message.includes('reconnect') ? 502 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
