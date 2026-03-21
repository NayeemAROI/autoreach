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
  // Try env first, then database
  const envId = process.env.UNIPILE_ACCOUNT_ID || '';
  if (envId) return envId;
  
  try {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'unipile_account_id'").get();
    return setting?.value || '';
  } catch {
    return '';
  }
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
  const accountId = getAccountId();
  if (!accountId) throw new Error('Unipile account ID not configured');

  const profile = await unipileFetch(`/users/${encodeURIComponent(publicIdentifier)}?account_id=${accountId}`);
  logger.info(`[Unipile] ✅ Got profile for ${publicIdentifier}: ${profile.first_name || ''} ${profile.last_name || ''}`);
  return profile;
}

/**
 * Send a connection request (invite) to a LinkedIn user
 */
async function sendInvite(publicIdentifier, message = '') {
  const accountId = getAccountId();
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
  const accountId = getAccountId();
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
  const accountId = getAccountId();
  return !!(apiKey && accountId);
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
};
