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

    // Fallback: check Unipile directly for any LinkedIn account (handles accounts connected outside the app)
    try {
      const accounts = await unipile.listAccounts();
      const items = accounts.items || [];
      const linkedin = items.find(a => a.type === 'LINKEDIN');
      if (linkedin && linkedin.id) {
        // Auto-save this account ID so future checks are fast
        unipile.setAccountId(linkedin.id, wsId);
        console.log(`[Integrations] Auto-discovered Unipile account ${linkedin.id} for workspace ${wsId}`);
        
        return res.json({
          connected: true,
          connectedAt: new Date().toISOString(),
          profileName: linkedin.name || 'LinkedIn Profile',
          profileUrl: '',
          method: 'unipile',
          accountId: linkedin.id
        });
      }
    } catch (discoverErr) {
      console.warn('[Integrations] Unipile discovery fallback failed:', discoverErr.message);
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
    const { username, password, proxyCountry } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const wsId = getWsId(req.user.id);
    const unipile = require('../services/unipileApi');
    console.log(`[Integrations] Connecting LinkedIn for workspace ${wsId} (proxy: ${proxyCountry || 'bd'})...`);
    
    const result = await unipile.connectLinkedIn(username, password, proxyCountry || 'bd');

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
    const { li_at, proxyCountry } = req.body;
    if (!li_at || typeof li_at !== 'string' || li_at.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a valid li_at cookie value.' });
    }

    const wsId = getWsId(req.user.id);
    const trimmed = li_at.trim();
    console.log(`[Integrations] Connecting via cookie for workspace ${wsId} (proxy: ${proxyCountry || 'bd'})...`);
    
    const unipile = require('../services/unipileApi');
    const result = await unipile.connectWithCookie(trimmed, proxyCountry || 'bd');

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

// POST /api/integrations/disconnect - Disconnect LinkedIn for this workspace only
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const wsId = getWsId(req.user.id);
    console.log(`[Integrations] Disconnecting LinkedIn for workspace ${wsId} (workspace-scoped only)`);
    
    // Only clear this workspace's stored account ID — do NOT delete from Unipile
    // Other workspaces may share the same Unipile account
    try {
      db.prepare(`DELETE FROM settings WHERE key = ?`).run(`unipile_account_id:${wsId}`);
    } catch {}

    // Clear conversations/messages for this workspace
    const convIds = db.prepare('SELECT id FROM conversations WHERE user_id = ? AND workspace_id = ?').all(req.user.id, wsId);
    for (const c of convIds) {
      db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(c.id);
    }
    db.prepare('DELETE FROM conversations WHERE user_id = ? AND workspace_id = ?').run(req.user.id, wsId);

    logAction(req, 'integration.linkedin_disconnected', 'integration');
    res.json({ success: true, message: 'LinkedIn disconnected from this workspace.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/sync-inbox - Clear old data and sync fresh from Unipile
router.post('/sync-inbox', authenticate, async (req, res) => {
  try {
    const wsId = getWsId(req.user.id);
    console.log(`[Integrations] Clearing and re-syncing inbox for user ${req.user.id}, workspace ${wsId}...`);
    
    // Clear old conversations and messages for this user/workspace
    const convIds = db.prepare('SELECT id FROM conversations WHERE user_id = ? AND workspace_id = ?').all(req.user.id, wsId);
    for (const c of convIds) {
      db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(c.id);
    }
    db.prepare('DELETE FROM conversations WHERE user_id = ? AND workspace_id = ?').run(req.user.id, wsId);
    console.log(`[Integrations] Cleared ${convIds.length} old conversations`);

    // Fresh sync from Unipile
    const unipile = require('../services/unipileApi');
    const result = await unipile.syncInbox(wsId, req.user.id);
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

// GET /api/integrations/status-stream - SSE endpoint for real-time status updates
// Note: EventSource can't send headers, so we accept token from query param
router.get('/status-stream', (req, res) => {
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET || 'autoreach-secret-key-change-in-production');
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send initial keepalive
  res.write('data: {"type":"ping"}\n\n');

  // Listen for webhook events
  const { webhookEvents } = require('./webhookHandler');
  const onStatus = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  webhookEvents.on('status', onStatus);

  // Keepalive every 30s
  const keepalive = setInterval(() => {
    res.write('data: {"type":"ping"}\n\n');
  }, 30000);

  // Cleanup on disconnect
  req.on('close', () => {
    webhookEvents.off('status', onStatus);
    clearInterval(keepalive);
  });
});

// POST /api/integrations/setup-webhook - Register webhook with Unipile
router.post('/setup-webhook', authenticate, async (req, res) => {
  try {
    const unipile = require('../services/unipileApi');
    const appUrl = process.env.APP_BASE_URL || req.body.appUrl;
    if (!appUrl) {
      return res.status(400).json({ error: 'APP_BASE_URL not configured. Set it in environment variables or pass appUrl in request body.' });
    }
    
    const result = await unipile.ensureWebhookRegistered(appUrl);
    res.json({ success: true, message: 'Webhook registered with Unipile.', webhook: result });
  } catch (err) {
    console.error('[Integrations] Webhook setup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/webhooks - List registered webhooks
router.get('/webhooks', authenticate, async (req, res) => {
  try {
    const unipile = require('../services/unipileApi');
    const webhooks = await unipile.listWebhooks();
    res.json({ webhooks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
