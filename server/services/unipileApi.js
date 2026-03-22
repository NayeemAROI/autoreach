/**
 * Unipile API Service — LinkedIn actions via Unipile managed API.
 * Handles: connection requests, messages, profile fetching.
 * No direct LinkedIn cookie management needed — Unipile handles sessions.
 */

const fetch = require('node-fetch');
const db = require('../db/database');
const logger = require('../utils/logger');

// Unipile config — loaded from environment or database
const UNIPILE_DSN = process.env.UNIPILE_DSN || 'api23.unipile.com:15371';
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY || '';
const UNIPILE_BASE = `https://${UNIPILE_DSN}/api/v1`;

function getApiKey() {
  // Try env first, then database
  if (UNIPILE_API_KEY) return UNIPILE_API_KEY;
  
  // Check database for stored key
  try {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'unipile_api_key'").get();
    return setting?.value || '';
  } catch {
    return '';
  }
}

function getAccountId(wsId) {
  // Workspace-scoped only — no global fallback
  if (wsId) {
    try {
      const setting = db.prepare("SELECT value FROM settings WHERE key = ?").get(`unipile_account_id:${wsId}`);
      if (setting?.value) return setting.value;
    } catch {}
  }
  return '';
}

/**
 * Get account ID with dynamic fallback — fetches from Unipile if not stored
 */
async function getAccountIdDynamic(wsId) {
  const stored = getAccountId(wsId);
  if (stored) return stored;
  
  // Auto-discover from Unipile — but DON'T auto-save (workspace must explicitly connect)
  try {
    const accounts = await unipileFetch('/accounts');
    const linkedin = (accounts.items || []).find(a => a.type === 'LINKEDIN');
    if (linkedin?.id) {
      return linkedin.id;
    }
  } catch {}
  
  return '';
}

/**
 * Make authenticated request to Unipile API
 */
async function unipileFetch(endpoint, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Unipile API key not configured');

  const url = `${UNIPILE_BASE}${endpoint}`;
  const headers = {
    'X-API-KEY': apiKey,
    'accept': 'application/json',
    ...(options.headers || {}),
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof Buffer)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  logger.info(`[Unipile] ${options.method || 'GET'} ${endpoint}`);
  
  const res = await fetch(url, { ...options, headers });
  
  if (!res.ok) {
    const text = await res.text();
    logger.error(`[Unipile] Error ${res.status}: ${text.substring(0, 300)}`);
    throw new Error(`Unipile API error (${res.status}): ${text.substring(0, 200)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

/**
 * Get user profile by LinkedIn public identifier (e.g., "john-doe")
 */
async function getUserProfile(publicIdentifier, wsId) {
  const accountId = await getAccountIdDynamic(wsId);
  if (!accountId) throw new Error('Unipile account ID not configured');

  const profile = await unipileFetch(`/users/${encodeURIComponent(publicIdentifier)}?account_id=${accountId}`);
  logger.info(`[Unipile] ✅ Got profile for ${publicIdentifier}: ${profile.first_name || ''} ${profile.last_name || ''}`);
  return profile;
}

/**
 * Send a connection request (invite) to a LinkedIn user
 */
async function sendInvite(publicIdentifier, message = '', wsId) {
  const accountId = await getAccountIdDynamic(wsId);
  if (!accountId) throw new Error('Unipile account ID not configured');

  // First get the provider_id from the public identifier
  let providerId = publicIdentifier;
  try {
    const profile = await getUserProfile(publicIdentifier);
    providerId = profile.provider_id || profile.id || publicIdentifier;
  } catch (err) {
    logger.warn(`[Unipile] Could not resolve profile, using public ID: ${err.message}`);
  }

  const body = {
    provider_id: providerId,
    account_id: accountId,
  };
  if (message) body.message = message.substring(0, 300); // LinkedIn limit

  const result = await unipileFetch('/users/invite', {
    method: 'POST',
    body,
  });

  logger.info(`[Unipile] ✅ Connection request sent to ${publicIdentifier}`);
  return result;
}

/**
 * Send a message to a LinkedIn user (must be connected)
 */
async function sendMessage(publicIdentifier, messageText) {
  const accountId = await getAccountIdDynamic();
  if (!accountId) throw new Error('Unipile account ID not configured');

  // Start a new chat or send to existing
  const body = {
    account_id: accountId,
    attendees_ids: [publicIdentifier],
    text: messageText,
  };

  const result = await unipileFetch('/chats', {
    method: 'POST',
    body,
  });

  logger.info(`[Unipile] ✅ Message sent to ${publicIdentifier}`);
  return result;
}

/**
 * View/fetch a LinkedIn profile
 */
async function viewProfile(publicIdentifier) {
  const profile = await getUserProfile(publicIdentifier);
  return {
    success: true,
    data: profile,
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    title: profile.headline || '',
    company: profile.company || '',
  };
}

/**
 * List connected accounts
 */
async function listAccounts() {
  return unipileFetch('/accounts');
}

/**
 * Check if Unipile is configured and working
 */
async function isConfigured(wsId) {
  const apiKey = getApiKey();
  if (!apiKey) return false;
  // If workspace specified, check if that workspace has an account
  if (wsId) {
    const accountId = getAccountId(wsId);
    return !!accountId;
  }
  return true;
}

async function healthCheck(wsId) {
  try {
    // If workspace-scoped, check specific account
    const accountId = wsId ? getAccountId(wsId) : '';
    if (wsId && !accountId) return { ok: false, error: 'No LinkedIn account connected for this workspace' };
    
    if (accountId) {
      // Check specific account status
      try {
        const data = await unipileFetch(`/accounts/${accountId}`);
        // Accept any non-error status — newly connected accounts may still be initializing
        const validStatuses = ['OK', 'CREATION', 'CREDENTIALS', 'CONNECTED'];
        const source = (data.sources || []).find(s => validStatuses.includes(s.status));
        if (!source && data.sources?.length > 0) {
          const actualStatus = data.sources.map(s => s.status).join(', ');
          return { ok: false, error: `LinkedIn account status: ${actualStatus}` };
        }
        // If no sources yet but account exists, still treat as connected (initializing)
        return { ok: true, accountId: data.id, name: data.name, status: source?.status || 'initializing' };
      } catch {
        return { ok: false, error: 'Account not found or expired' };
      }
    }
    
    // Global fallback: check any LinkedIn account
    const accounts = await listAccounts();
    const items = accounts.items || [];
    const linkedin = items.find(a => a.type === 'LINKEDIN');
    if (!linkedin) return { ok: false, error: 'No LinkedIn account connected in Unipile' };
    
    const validStatuses = ['OK', 'CREATION', 'CREDENTIALS', 'CONNECTED'];
    const source = (linkedin.sources || []).find(s => validStatuses.includes(s.status));
    if (!source && linkedin.sources?.length > 0) {
      return { ok: false, error: 'LinkedIn account not active in Unipile' };
    }
    
    return { ok: true, accountId: linkedin.id, name: linkedin.name };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Connect a LinkedIn account using email/password via Unipile
 * Returns: { success, accountId } or { checkpoint, accountId, type }
 */

/**
 * Get proxy config for Unipile account creation (residential IP)
 */
function getProxyConfig(countryCode = 'bd') {
  // 'none' means no proxy
  if (!countryCode || countryCode === 'none') return null;

  const host = process.env.PROXY_HOST || 'geo.iproyal.com';
  const port = parseInt(process.env.PROXY_PORT || '12321');
  const user = process.env.PROXY_USER || '6irlNOIFopruAF3N';
  const basePass = process.env.PROXY_PASS_BASE || 'CRIxa5PpT7UoSQVV';
  
  if (!host || !user) return null;
  
  // IPRoyal uses _country-XX suffix for geo-targeting
  const pass = `${basePass}_country-${countryCode.toLowerCase()}`;
  
  return {
    protocol: 'http',
    host: host,
    port: port,
    username: user,
    password: pass
  };
}

async function connectLinkedIn(username, password, proxyCountry = 'bd') {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Unipile API key not configured');

  const proxy = getProxyConfig(proxyCountry);
  const bodyObj = {
    provider: 'LINKEDIN',
    username: username,
    password: password,
  };
  if (proxy) bodyObj.proxy = proxy;
  // Also set top-level country for Unipile's built-in geo support
  if (proxyCountry && proxyCountry !== 'none') bodyObj.country = proxyCountry.toUpperCase();
  logger.info(`[Unipile] Connecting LinkedIn with proxy: ${proxy ? proxy.host + ':' + proxy.port : 'none'}, country: ${proxyCountry}`);

  const url = `${UNIPILE_BASE}/accounts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyObj),
  });

  let data;
  const rawText = await res.text();
  try {
    data = JSON.parse(rawText);
  } catch {
    logger.error(`[Unipile] Non-JSON response (${res.status}): ${rawText.substring(0, 300)}`);
    throw new Error(`Unipile returned invalid response (${res.status})`);
  }
  
  // Log full response for debugging
  logger.info(`[Unipile] LinkedIn connect response (${res.status}): ${JSON.stringify(data).substring(0, 500)}`);
  
  // Check if checkpoint required (2FA, CAPTCHA, etc.)
  // Unipile may return 202, 200 with checkpoint object, or even 401 for verification
  if (res.status === 202 || data.checkpoint || data.object === 'Checkpoint') {
    logger.info(`[Unipile] LinkedIn login requires checkpoint: ${data.checkpoint?.type || data.type || 'unknown'}`);
    return {
      checkpoint: true,
      accountId: data.account_id || data.id || '',
      type: data.checkpoint?.type || data.type || '2FA',
      message: data.checkpoint?.message || data.message || 'LinkedIn requires verification',
    };
  }

  // Handle 401 — could be wrong password OR LinkedIn security challenge
  if (res.status === 401) {
    const detail = data.detail || data.error || data.message || '';
    // Check if Unipile hints at a checkpoint/verification in the error
    if (detail.toLowerCase().includes('checkpoint') || detail.toLowerCase().includes('challenge') || detail.toLowerCase().includes('verify')) {
      return {
        checkpoint: true,
        accountId: data.account_id || data.id || '',
        type: 'verification',
        message: 'LinkedIn requires verification. Please log in at linkedin.com first, complete any security checks, then try again.',
      };
    }
    throw new Error(
      'LinkedIn login rejected (401). This usually means LinkedIn is blocking the login from an unfamiliar location. ' +
      'Try: 1) Log into linkedin.com manually first 2) Complete any security challenges 3) Then retry here, or use the li_at cookie method instead.'
    );
  }

  if (!res.ok) {
    const errMsg = data.error || data.message || data.detail || `Login failed (${res.status})`;
    throw new Error(errMsg);
  }

  // Success — store account ID
  const accountId = data.id || data.account_id || '';
  if (accountId) {
    setAccountId(accountId);
  }

  logger.info(`[Unipile] ✅ LinkedIn connected: ${data.name || username} (${accountId})`);
  return {
    success: true,
    accountId,
    name: data.name || username,
  };
}

/**
 * Connect LinkedIn account using a li_at cookie via Unipile
 */
async function connectWithCookie(liAtCookie, proxyCountry = 'bd') {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Unipile API key not configured');

  const proxy = getProxyConfig(proxyCountry);
  const bodyObj = {
    provider: 'LINKEDIN',
    access_token: liAtCookie,
  };
  if (proxy) bodyObj.proxy = proxy;
  // Also set top-level country for Unipile's built-in geo support
  if (proxyCountry && proxyCountry !== 'none') bodyObj.country = proxyCountry.toUpperCase();
  logger.info(`[Unipile] Connecting LinkedIn via cookie with proxy: ${proxy ? proxy.host + ':' + proxy.port : 'none'}, country: ${proxyCountry}`);

  const url = `${UNIPILE_BASE}/accounts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyObj),
  });

  let data;
  const rawText = await res.text();
  try {
    data = JSON.parse(rawText);
  } catch {
    logger.error(`[Unipile] Cookie connect non-JSON response: ${rawText.substring(0, 500)}`);
    throw new Error(`Unexpected response from Unipile (${res.status})`);
  }

  if (!res.ok) {
    const errMsg = data.error || data.message || data.detail || JSON.stringify(data);
    logger.error(`[Unipile] Cookie connect failed (${res.status}): ${errMsg}`);
    throw new Error(errMsg);
  }

  const accountId = data.id || data.account_id || '';
  if (accountId) setAccountId(accountId);

  logger.info(`[Unipile] ✅ LinkedIn connected via cookie: ${data.name || ''} (${accountId})`);
  return {
    success: true,
    accountId,
    name: data.name || 'LinkedIn Profile',
  };
}

/**
 * Solve a LinkedIn checkpoint (2FA code, OTP, CAPTCHA)
 */
async function solveCheckpoint(accountId, code) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Unipile API key not configured');

  const url = `${UNIPILE_BASE}/accounts/checkpoint`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ account_id: accountId, code, provider: 'LINKEDIN' }),
  });

  const data = await res.json();

  // Another checkpoint may follow
  if (res.status === 202 || data.checkpoint || data.object === 'Checkpoint') {
    return {
      checkpoint: true,
      type: data.checkpoint?.type || data.type || '2FA',
      message: data.checkpoint?.message || data.message || 'Additional verification required',
    };
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || `Checkpoint failed (${res.status})`);
  }

  // Store account ID on success
  setAccountId(accountId);
  logger.info(`[Unipile] ✅ Checkpoint solved, account ${accountId} connected`);
  
  return { success: true, accountId };
}

/**
 * Store account ID for future use
 */
function setAccountId(accountId, wsId) {
  try {
    const key = wsId ? `unipile_account_id:${wsId}` : 'unipile_account_id';
    db.prepare(`INSERT OR REPLACE INTO settings (key, user_id, value) VALUES (?, 'system', ?)`).run(key, accountId);
    logger.info(`[Unipile] Account ID saved: ${accountId} (workspace: ${wsId || 'global'})`);
  } catch (err) {
    logger.warn(`[Unipile] DB save failed: ${err.message}`);
  }
}

/**
 * Delete/disconnect a LinkedIn account from Unipile
 */
async function deleteAccount(accountId, wsId) {
  if (!accountId) accountId = await getAccountIdDynamic(wsId);
  if (!accountId) throw new Error('No account ID to disconnect');

  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Unipile API key not configured');

  const url = `${UNIPILE_BASE}/accounts/${encodeURIComponent(accountId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-API-KEY': apiKey,
      'accept': 'application/json',
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    logger.error(`[Unipile] Delete account failed: ${res.status} - ${text.substring(0, 200)}`);
    throw new Error(`Failed to disconnect from Unipile (${res.status})`);
  }

  // Clear stored account ID
  try {
    const key = wsId ? `unipile_account_id:${wsId}` : 'unipile_account_id';
    db.prepare(`DELETE FROM settings WHERE key = ?`).run(key);
    if (!wsId) delete process.env.UNIPILE_ACCOUNT_ID;
  } catch {}

  logger.info(`[Unipile] ✅ Account ${accountId} disconnected`);
  return { success: true };
}

/**
 * Sync inbox — fetch recent messages via Unipile
 */
async function syncInbox(wsId, userId) {
  const accountId = await getAccountIdDynamic(wsId);
  if (!accountId) throw new Error('No LinkedIn account connected');

  logger.info(`[Unipile] Starting inbox sync for user ${userId}, workspace ${wsId}...`);
  const data = await unipileFetch(`/chats?account_id=${accountId}&limit=50`);
  const chats = data.items || [];
  logger.info(`[Unipile] Fetched ${chats.length} conversations`);

  const { v4: uuidv4 } = require('uuid');
  let messageCount = 0;
  let newConversations = 0;

  for (const chat of chats.slice(0, 30)) {
    try {
      // Fetch attendees from the separate endpoint (Unipile doesn't include them in chat object)
      let participantName = chat.name || 'Unknown';
      let participantUrl = '';

      try {
        const attendeesData = await unipileFetch(`/chats/${chat.id}/attendees`);
        const attendees = attendeesData.items || attendeesData || [];
        
        // Find the other person (is_self === 0 means it's not us)
        const other = attendees.find(a => a.is_self === 0 || a.is_self === false) || {};
        
        if (other.name) participantName = other.name;
        if (other.profile_url) {
          participantUrl = other.profile_url;
        } else if (other.provider_id) {
          participantUrl = `https://www.linkedin.com/in/${other.provider_id}`;
        }
      } catch (attErr) {
        logger.warn(`[Unipile] Could not fetch attendees for chat ${chat.id}: ${attErr.message}`);
      }

      // Find or create conversation
      let conv = null;
      if (participantUrl) {
        conv = db.prepare('SELECT id FROM conversations WHERE participantUrl = ? AND user_id = ?').get(participantUrl, userId);
      }
      if (!conv && participantName !== 'Unknown') {
        conv = db.prepare('SELECT id FROM conversations WHERE participantName = ? AND user_id = ? AND workspace_id = ?').get(participantName, userId, wsId);
      }

      if (!conv) {
        const convId = uuidv4();
        const lead = participantUrl ? db.prepare('SELECT id FROM leads WHERE linkedinUrl = ? AND user_id = ?').get(participantUrl, userId) : null;
        
        try {
          db.prepare(`
            INSERT INTO conversations (id, user_id, workspace_id, lead_id, participantName, participantUrl, lastMessage, lastMessageAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(convId, userId, wsId, lead?.id || null, participantName, participantUrl, '', '1970-01-01T00:00:00Z');
          conv = { id: convId };
          newConversations++;
        } catch (insertErr) {
          logger.warn(`[Unipile] Failed to create conversation: ${insertErr.message}`);
          continue;
        }
      } else {
        // Update existing conversation name if it was Unknown
        if (participantName !== 'Unknown') {
          db.prepare('UPDATE conversations SET participantName = ? WHERE id = ? AND participantName = ?').run(participantName, conv.id, 'Unknown');
        }
      }

      // Fetch messages for this chat
      const msgs = await unipileFetch(`/chats/${chat.id}/messages?limit=15`);
      const items = msgs.items || [];

      let latestMessage = '';
      let latestTimestamp = '1970-01-01T00:00:00Z';

      for (const msg of items) {
        const msgLinkedInId = msg.id || msg.provider_id || '';
        
        // Skip if already synced
        if (msgLinkedInId) {
          const existing = db.prepare('SELECT id FROM messages WHERE linkedinMessageId = ?').get(msgLinkedInId);
          if (existing) continue;
        }

        // Determine direction — use is_sender field from Unipile
        const isOutbound = msg.is_sender === 1 || msg.is_sender === true;
        const direction = isOutbound ? 'outbound' : 'inbound';
        
        // Sender name from message
        const msgSenderName = msg.sender_name || msg.sender?.name || '';
        const senderName = isOutbound ? 'You' : (msgSenderName || participantName);
        const content = msg.text || msg.body || msg.text_content || '';
        const timestamp = msg.timestamp || msg.date || msg.created_at || new Date().toISOString();

        try {
          db.prepare(`
            INSERT INTO messages (id, conversation_id, user_id, direction, content, senderName, linkedinMessageId, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(uuidv4(), conv.id, userId, direction, content, senderName, msgLinkedInId, timestamp);
          messageCount++;

          // Track latest message
          if (content && timestamp > latestTimestamp) {
            latestMessage = content.substring(0, 200);
            latestTimestamp = timestamp;
          }

          if (direction === 'inbound') {
            db.prepare("UPDATE conversations SET unreadCount = unreadCount + 1 WHERE id = ?").run(conv.id);
          }
        } catch (msgErr) {
          // Skip duplicate messages silently
        }
      }

      // Update conversation with the latest message
      if (latestMessage) {
        db.prepare("UPDATE conversations SET lastMessage = ?, lastMessageAt = ? WHERE id = ?")
          .run(latestMessage, latestTimestamp, conv.id);
      }
    } catch (chatErr) {
      logger.warn(`[Unipile] Failed to sync chat ${chat.id}: ${chatErr.message}`);
    }
  }

  logger.info(`[Unipile] ✅ Synced ${messageCount} messages from ${chats.length} chats (${newConversations} new)`);
  return { success: true, conversations: chats.length, messages: messageCount, newConversations };
}

/**
 * Get full LinkedIn profile from URL or username via Unipile
 */
async function getUserFullProfile(profileUrl, wsId) {
  const accountId = await getAccountIdDynamic(wsId);
  if (!accountId) throw new Error('No LinkedIn account connected');

  // Extract username from URL
  let identifier = profileUrl;
  const match = profileUrl.match(/linkedin\.com\/in\/([^\/\?]+)/i);
  if (match) identifier = match[1];

  logger.info(`[Unipile] Fetching full profile for: ${identifier}`);
  const data = await unipileFetch(`/users/${encodeURIComponent(identifier)}?account_id=${accountId}`);
  
  logger.info(`[Unipile] ✅ Got full profile: ${data.first_name} ${data.last_name}`);
  return {
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    company: data.company || data.company_name || '',
    title: data.headline || data.occupation || '',
    location: data.location || '',
    about: data.summary || data.about || '',
    profilePicture: data.profile_picture || data.avatar || '',
    connections: data.connections_count || 0,
    industry: data.industry || '',
  };
}

/**
 * Register a webhook with Unipile for account status updates
 */
async function registerWebhook(requestUrl) {
  logger.info(`[Unipile] Registering webhook: ${requestUrl}`);
  const data = await unipileFetch('/webhooks', {
    method: 'POST',
    body: JSON.stringify({
      request_url: requestUrl,
      source: 'account_status',
      name: 'Autoreach Account Status',
      headers: { 'Content-Type': 'application/json' }
    })
  });
  logger.info(`[Unipile] ✅ Webhook registered: ${JSON.stringify(data)}`);
  return data;
}

/**
 * List all registered webhooks
 */
async function listWebhooks() {
  const data = await unipileFetch('/webhooks');
  return data.items || data || [];
}

/**
 * Delete a webhook
 */
async function deleteWebhook(webhookId) {
  await unipileFetch(`/webhooks/${webhookId}`, { method: 'DELETE' });
  logger.info(`[Unipile] Deleted webhook ${webhookId}`);
}

/**
 * Ensure webhook is registered — called on server startup
 */
async function ensureWebhookRegistered(appBaseUrl) {
  if (!appBaseUrl) {
    logger.warn('[Unipile] No APP_BASE_URL set — skipping webhook registration');
    return;
  }
  
  const webhookUrl = `${appBaseUrl}/api/webhooks/unipile`;
  
  try {
    const webhooks = await listWebhooks();
    const existing = webhooks.find(w => w.request_url === webhookUrl);
    
    if (existing) {
      logger.info(`[Unipile] Webhook already registered: ${webhookUrl}`);
      return existing;
    }
    
    const result = await registerWebhook(webhookUrl);
    logger.info(`[Unipile] Webhook auto-registered: ${webhookUrl}`);
    return result;
  } catch (err) {
    logger.warn(`[Unipile] Failed to register webhook: ${err.message}`);
  }
}

module.exports = {
  getUserProfile,
  sendInvite,
  sendMessage,
  viewProfile,
  listAccounts,
  isConfigured,
  healthCheck,
  getApiKey,
  getAccountId,
  connectLinkedIn,
  connectWithCookie,
  solveCheckpoint,
  setAccountId,
  deleteAccount,
  syncInbox,
  getUserFullProfile,
  registerWebhook,
  listWebhooks,
  deleteWebhook,
  ensureWebhookRegistered,
};
