const express = require('express');
const router = express.Router();
const db = require('../db/database');
const EventEmitter = require('events');

// Global event emitter for broadcasting webhook events to SSE clients
const webhookEvents = new EventEmitter();
webhookEvents.setMaxListeners(100); // Allow many concurrent SSE connections

/**
 * POST /api/webhooks/unipile
 * Receives account status updates from Unipile webhooks.
 * Must respond with 200 within 30 seconds.
 * 
 * Unipile webhook payload for account_status:
 * {
 *   "event": "account_status",
 *   "account_id": "...",
 *   "status": "OK" | "CONNECTING" | "CREATION_SUCCESS" | "RECONNECTED" | "CREDENTIALS" | "ERROR" | "DISCONNECTED" | "DELETED",
 *   "name": "Account Name",
 *   "type": "LINKEDIN",
 *   ...checkpoint info if applicable
 * }
 */
router.post('/unipile', (req, res) => {
  // Respond immediately — Unipile requires < 30s response
  res.status(200).json({ received: true });

  const payload = req.body;
  console.log(`[Webhook] Received Unipile event:`, JSON.stringify(payload).substring(0, 500));

  try {
    const event = payload.event || payload.type || 'unknown';
    const accountId = payload.account_id || payload.id || '';
    const status = payload.status || payload.sync_status || '';
    const accountName = payload.name || payload.display_name || '';
    const accountType = payload.provider || payload.type || '';

    // Store the webhook event in DB for audit trail
    try {
      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('webhook_last_event', ?)
      `).run(JSON.stringify({
        event,
        accountId,
        status,
        accountName,
        accountType,
        timestamp: new Date().toISOString(),
        raw: JSON.stringify(payload).substring(0, 1000)
      }));
    } catch (dbErr) {
      console.warn('[Webhook] Failed to store event:', dbErr.message);
    }

    // Handle different statuses
    switch (status) {
      case 'OK':
      case 'CREATION_SUCCESS':
      case 'RECONNECTED': {
        console.log(`[Webhook] ✅ Account ${accountId} connected successfully (${status})`);
        // Auto-save account ID
        if (accountId) {
          const unipile = require('../services/unipileApi');
          unipile.setAccountId(accountId);
          console.log(`[Webhook] Saved account ID: ${accountId}`);
        }
        // Broadcast to frontend
        webhookEvents.emit('status', {
          type: 'connected',
          accountId,
          accountName,
          status,
          message: `LinkedIn connected as ${accountName || 'Unknown'}!`
        });
        break;
      }

      case 'CONNECTING': {
        console.log(`[Webhook] 🔄 Account ${accountId} is connecting...`);
        webhookEvents.emit('status', {
          type: 'connecting',
          accountId,
          status,
          message: 'Connecting to LinkedIn...'
        });
        break;
      }

      case 'CREDENTIALS': {
        console.log(`[Webhook] ⚠️ Account ${accountId} needs re-authentication`);
        webhookEvents.emit('status', {
          type: 'checkpoint',
          accountId,
          status,
          checkpointType: payload.checkpoint_type || payload.checkpoint?.type || '2FA',
          message: payload.checkpoint_message || 'LinkedIn requires verification. Please enter the code.'
        });
        break;
      }

      case 'ERROR': {
        console.log(`[Webhook] ❌ Account ${accountId} error: ${payload.error || payload.message || 'Unknown error'}`);
        webhookEvents.emit('status', {
          type: 'error',
          accountId,
          status,
          message: payload.error || payload.message || 'LinkedIn connection error.'
        });
        break;
      }

      case 'DISCONNECTED':
      case 'DELETED': {
        console.log(`[Webhook] 🔌 Account ${accountId} disconnected/deleted`);
        webhookEvents.emit('status', {
          type: 'disconnected',
          accountId,
          status,
          message: 'LinkedIn account disconnected.'
        });
        break;
      }

      default: {
        console.log(`[Webhook] Unknown status "${status}" for account ${accountId}`);
        webhookEvents.emit('status', {
          type: 'unknown',
          accountId,
          status,
          message: `Account status: ${status}`
        });
      }
    }
  } catch (err) {
    console.error('[Webhook] Error processing event:', err.message);
  }
});

module.exports = { router, webhookEvents };
