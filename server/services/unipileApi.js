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

function getAccountId() {
  // Check database first (has latest from login)
  try {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'unipile_account_id'").get();
    if (setting?.value) return setting.value;
  } catch {}
  
  // Fall back to env var
  const envId = process.env.UNIPILE_ACCOUNT_ID || '';
  if (envId) return envId;
  
  return '';
}

/**
 * Get account ID with dynamic fallback — fetches from Unipile if not stored
 */
async function getAccountIdDynamic() {
  const stored = getAccountId();
  if (stored) return stored;
  
  // Try to get from Unipile accounts list
  try {
    const accounts = await unipileFetch('/accounts');
    const linkedin = (accounts.items || []).find(a => a.type === 'LINKEDIN');
    if (linkedin?.id) {
      setAccountId(linkedin.id);
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
async function getUserProfile(publicIdentifier) {
  const accountId = await getAccountIdDynamic();
  if (!accountId) throw new Error('Unipile account ID not configured');

  const profile = await unipileFetch(`/users/${encodeURIComponent(publicIdentifier)}?account_id=${accountId}`);
  logger.info(`[Unipile] ✅ Got profile for ${publicIdentifier}: ${profile.first_name || ''} ${profile.last_name || ''}`);
  return profile;
}

/**
 * Send a connection request (invite) to a LinkedIn user
 */
async function sendInvite(publicIdentifier, message = '') {
  const accountId = await getAccountIdDynamic();
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
async function isConfigured() {
  const apiKey = getApiKey();
  return !!apiKey;
}

async function healthCheck() {
  try {
    const accounts = await listAccounts();
    const items = accounts.items || [];
    const linkedin = items.find(a => a.type === 'LINKEDIN');
    if (!linkedin) return { ok: false, error: 'No LinkedIn account connected in Unipile' };
    
    const source = (linkedin.sources || []).find(s => s.status === 'OK');
    if (!source) return { ok: false, error: 'LinkedIn account not active in Unipile' };
    
    return { ok: true, accountId: linkedin.id, name: linkedin.name };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Connect a LinkedIn account using email/password via Unipile
 * Returns: { success, accountId } or { checkpoint, accountId, type }
 */
async function connectLinkedIn(username, password) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Unipile API key not configured');

  const url = `${UNIPILE_BASE}/accounts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'LINKEDIN',
      username: username,
      password: password,
    }),
  });

  const data = await res.json();
  
  // Check if checkpoint required (2FA, CAPTCHA, etc.)
  if (res.status === 202 || data.checkpoint || data.object === 'Checkpoint') {
    logger.info(`[Unipile] LinkedIn login requires checkpoint: ${data.checkpoint?.type || data.type || 'unknown'}`);
    return {
      checkpoint: true,
      accountId: data.account_id || data.id || '',
      type: data.checkpoint?.type || data.type || '2FA',
      message: data.checkpoint?.message || data.message || 'LinkedIn requires verification',
    };
  }

  if (!res.ok) {
    const errMsg = data.error || data.message || `Login failed (${res.status})`;
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
async function connectWithCookie(liAtCookie) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Unipile API key not configured');

  const url = `${UNIPILE_BASE}/accounts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: 'LINKEDIN',
      access_token: liAtCookie,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || data.detail || `Cookie connect failed (${res.status})`);
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
function setAccountId(accountId) {
  try {
    db.prepare(`INSERT OR REPLACE INTO settings (key, user_id, value) VALUES ('unipile_account_id', 'system', ?)`).run(accountId);
    // Also set in env for current process
    process.env.UNIPILE_ACCOUNT_ID = accountId;
    logger.info(`[Unipile] Account ID saved: ${accountId}`);
  } catch (err) {
    // Fallback: just set env var if DB fails
    process.env.UNIPILE_ACCOUNT_ID = accountId;
    logger.warn(`[Unipile] DB save failed, using env: ${err.message}`);
  }
}

/**
 * Delete/disconnect a LinkedIn account from Unipile
 */
async function deleteAccount(accountId) {
  if (!accountId) accountId = await getAccountIdDynamic();
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
    db.prepare(`DELETE FROM settings WHERE key = 'unipile_account_id'`).run();
    delete process.env.UNIPILE_ACCOUNT_ID;
  } catch {}

  logger.info(`[Unipile] ✅ Account ${accountId} disconnected`);
  return { success: true };
}

/**
 * Sync inbox — fetch recent messages via Unipile
 */
async function syncInbox() {
  const accountId = await getAccountIdDynamic();
  if (!accountId) throw new Error('No LinkedIn account connected');

  logger.info(`[Unipile] Starting inbox sync...`);
  const data = await unipileFetch(`/chats?account_id=${accountId}&limit=50`);
  const chats = data.items || [];
  logger.info(`[Unipile] Fetched ${chats.length} conversations`);

  let messageCount = 0;
  for (const chat of chats.slice(0, 20)) {
    try {
      const msgs = await unipileFetch(`/chats/${chat.id}/messages?limit=10`);
      messageCount += (msgs.items || []).length;
    } catch {}
  }

  logger.info(`[Unipile] ✅ Synced ${messageCount} messages from ${chats.length} chats`);
  return { success: true, conversations: chats.length, messages: messageCount };
}

/**
 * Get full LinkedIn profile from URL or username via Unipile
 */
async function getUserFullProfile(profileUrl) {
  const accountId = await getAccountIdDynamic();
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
};
