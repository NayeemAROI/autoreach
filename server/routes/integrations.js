const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const linkedinApi = require('../services/linkedinApi');
const db = require('../db/database');
const { logAction } = require('../services/auditLog');

// Helper: get user's active workspace_id
function getWsId(userId) {
  const user = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
  return user?.activeWorkspaceId || '';
}

// GET /api/integrations/status - Check LinkedIn connection status (workspace-scoped)
router.get('/status', authenticate, async (req, res) => {
  try {
    const wsId = getWsId(req.user.id);
    const unipile = require('../services/unipileApi');
    const configured = await unipile.isConfigured(wsId);
    
    if (configured) {
      const health = await unipile.healthCheck(wsId);
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

    const wsId = getWsId(req.user.id);
    const unipile = require('../services/unipileApi');
    console.log(`[Integrations] Connecting LinkedIn for workspace ${wsId}...`);
    
    const result = await unipile.connectLinkedIn(username, password);

    if (result.checkpoint) {
      return res.json({
        checkpoint: true,
        accountId: result.accountId,
        type: result.type,
        message: result.message,
      });
    }

    // Save account ID for this workspace
    if (result.accountId) {
      unipile.setAccountId(result.accountId, wsId);
    }

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

    const wsId = getWsId(req.user.id);
    const unipile = require('../services/unipileApi');
    console.log(`[Integrations] Solving checkpoint for account ${accountId}...`);
    
    const result = await unipile.solveCheckpoint(accountId, code);

    if (result.checkpoint) {
      return res.json({
        checkpoint: true,
        type: result.type,
        message: result.message,
      });
    }

    // Save account ID for this workspace
    if (result.accountId) {
      unipile.setAccountId(result.accountId, wsId);
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

    const wsId = getWsId(req.user.id);
    const trimmed = li_at.trim();
    console.log(`[Integrations] Connecting via cookie for workspace ${wsId}...`);
    
    const unipile = require('../services/unipileApi');
    const result = await unipile.connectWithCookie(trimmed);

    // Save account ID for this workspace
    if (result.accountId) {
      unipile.setAccountId(result.accountId, wsId);
    }

    logAction(req, 'integration.linkedin_connected', 'integration', '', result.name);
    res.json({
      success: true,
      profileName: result.name,
      accountId: result.accountId,
      message: `Connected as ${result.name}!`
    });
  } catch (err) {
    console.error('[Integrations] Cookie connect error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/integrations/disconnect - Disconnect LinkedIn for this workspace
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const wsId = getWsId(req.user.id);
    const unipile = require('../services/unipileApi');
    const accountId = unipile.getAccountId(wsId);
    
    if (accountId) {
      try {
        await unipile.deleteAccount(accountId, wsId);
      } catch (err) {
        console.warn('[Integrations] Unipile disconnect warning:', err.message);
      }
    }

    // Clear workspace-scoped account ID
    try {
      db.prepare(`DELETE FROM settings WHERE key = ?`).run(`unipile_account_id:${wsId}`);
    } catch {}

    logAction(req, 'integration.linkedin_disconnected', 'integration');
    res.json({ success: true, message: 'LinkedIn disconnected.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/sync-inbox - Trigger server-side inbox sync via Unipile
router.post('/sync-inbox', authenticate, async (req, res) => {
  try {
    console.log(`[Integrations] Starting inbox sync for user ${req.user.id}...`);
    const unipile = require('../services/unipileApi');
    const result = await unipile.syncInbox();
    logAction(req, 'integration.inbox_synced', 'integration', '', '', { messages: result.messages, conversations: result.conversations });
    res.json({
      success: true,
      message: `Synced ${result.messages} messages across ${result.conversations} conversations.`,
      ...result
    });
  } catch (err) {
    console.error('[Integrations] Sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/enrich-profile - Get full profile info from LinkedIn URL
router.post('/enrich-profile', authenticate, async (req, res) => {
  try {
    const { linkedinUrl } = req.body;
    if (!linkedinUrl) return res.status(400).json({ error: 'LinkedIn URL required' });
    
    const unipile = require('../services/unipileApi');
    const profile = await unipile.getUserFullProfile(linkedinUrl);
    res.json({ success: true, profile });
  } catch (err) {
    console.error('[Integrations] Enrich error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
