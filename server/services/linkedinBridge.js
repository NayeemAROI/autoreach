const WebSocket = require('ws');
const EventEmitter = require('events');
const jwt = require('jsonwebtoken');

class ExtensionBridge extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.activeConnections = new Map(); // map userId -> ws
    // We now could handle multiple sessions, but for simplicity we assume one active connection
    this.session = {
      li_at: null,
      JSESSIONID: null,
      connectedAt: null,
      userId: null
    };
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        console.log('❌ [Websocket] Connection rejected: No token provided');
        ws.close(1008, 'Token required');
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_change_in_production');
        ws.userId = decoded.id;
        console.log(`🔗 [Websocket] Chrome Extension connected for user: ${decoded.id}`);
        this.activeConnections.set(decoded.id, ws);
      } catch (err) {
        console.log('❌ [Websocket] Connection rejected: Invalid token');
        ws.close(1008, 'Invalid token');
        return;
      }

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(data, ws.userId);
        } catch (err) {
          console.error('Failed to parse extension message:', err);
        }
      });

      ws.on('close', () => {
        console.log(`❌ [Websocket] Chrome Extension disconnected for user: ${ws.userId}`);
        if (this.activeConnections.get(ws.userId) === ws) {
          this.activeConnections.delete(ws.userId);
        }
      });
    });
  }

  handleMessage(data, userId) {
    if (data.type === 'SESSION_SYNC') {
      console.log(`📥 [Websocket] Received LinkedIn session from extension for user: ${userId}`);
      this.session = {
        ...data.payload,
        userId: userId,
        connectedAt: new Date().toISOString()
      };
      this.emit('session_updated', this.session);
    } 
    else if (data.type === 'ACTION_COMPLETED') {
      console.log(`✅ [Websocket] Action completed by extension for user ${userId}:`, data.payload);
      this.emit('action_completed', { ...data.payload, userId });
    }
    else if (data.type === 'ACTION_FAILED') {
      console.error(`⚠️ [Websocket] Action failed in extension for user ${userId}:`, data.payload);
      this.emit('action_failed', { ...data.payload, userId });
    }
    else if (data.type === 'PROFILE_DATA') {
      console.log(`📥 [Websocket] Profile data received from extension for user ${userId}`);
      this.emit('profile_scraped', { ...data.payload, userId });
    }
    else if (data.type === 'SILENT_VERIFY_SUCCESS') {
      console.log(`✅ [Websocket] Silent Verify success for lead ${data.payload.leadId}`);
      this.emit('silent_verify_success', { ...data.payload, userId });
    }
    else if (data.type === 'SILENT_VERIFY_FAILED') {
      console.error(`❌ [Websocket] Silent Verify failed for lead ${data.payload.leadId}:`, data.payload.error);
      this.emit('silent_verify_failed', { ...data.payload, userId });
    }
    else if (data.type === 'MESSAGES_DATA') {
      console.log(`📥 [Websocket] Messages data received from extension for user ${userId}: ${data.payload?.messages?.length || 0} messages`);
      this.emit('messages_synced', { ...data.payload, userId });
      // Auto-sync into inbox
      this.autoSyncMessages(data.payload.messages || [], userId);
    }
  }

  // --- Methods for the Backend to call the Extension ---

  isConnected(userId) {
    // If no userId provided, return true if ANY extension is connected (for global health checks)
    if (!userId) return this.activeConnections.size > 0;
    
    const ws = this.activeConnections.get(userId);
    return ws && ws.readyState === WebSocket.OPEN;
  }

  getStatus(userId) {
    return {
      connected: this.isConnected(userId),
      hasSession: this.session.userId === userId && !!this.session.li_at,
      sessionAge: this.session.userId === userId ? this.session.connectedAt : null
    };
  }

  sendCommand(userId, type, payload) {
    const ws = this.activeConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }

  sendConnectionRequest(userId, profileUrl, message = '') {
    return this.sendCommand(userId, 'SEND_CONNECTION', { url: profileUrl, message });
  }

  scrapeProfile(userId, profileUrl) {
    return this.sendCommand(userId, 'FIND_LEAD', { url: profileUrl });
  }

  silentVerify(userId, profileUrl, leadId) {
    return this.sendCommand(userId, 'SILENT_VERIFY', { url: profileUrl, leadId });
  }

  syncInbox(userId) {
    return this.sendCommand(userId, 'SYNC_INBOX', {});
  }

  autoSyncMessages(messages, userId) {
    // Call the inbox sync endpoint internally
    const db = require('../db/database');
    const { v4: uuidv4 } = require('uuid');
    let synced = 0;

    for (const msg of messages) {
      const { participantName, participantUrl, content, direction = 'inbound', linkedinMessageId, timestamp } = msg;

      // Skip if already synced
      if (linkedinMessageId) {
        const existing = db.prepare('SELECT id FROM messages WHERE linkedinMessageId = ?').get(linkedinMessageId);
        if (existing) continue;
      }

      // Find or create conversation
      let conversation = db.prepare('SELECT id FROM conversations WHERE participantUrl = ? AND user_id = ?')
        .get(participantUrl, userId);

      if (!conversation) {
        const convId = uuidv4();
        const lead = db.prepare('SELECT id FROM leads WHERE linkedinUrl = ? AND user_id = ?').get(participantUrl, userId);
        const wsUser = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
        const wsId = wsUser?.activeWorkspaceId || '';
        db.prepare('INSERT INTO conversations (id, user_id, workspace_id, lead_id, participantName, participantUrl, lastMessage, lastMessageAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(convId, userId, wsId, lead?.id || null, participantName || '', participantUrl || '', content?.substring(0, 200) || '', timestamp || new Date().toISOString());
        conversation = { id: convId };
      }

      db.prepare('INSERT INTO messages (id, conversation_id, user_id, direction, content, senderName, linkedinMessageId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), conversation.id, userId, direction, content || '', direction === 'inbound' ? participantName : 'You', linkedinMessageId || '', timestamp || new Date().toISOString());

      if (direction === 'inbound') {
        db.prepare("UPDATE conversations SET lastMessage = ?, lastMessageAt = ?, unreadCount = unreadCount + 1 WHERE id = ?")
          .run(content?.substring(0, 200) || '', timestamp || new Date().toISOString(), conversation.id);
      } else {
        db.prepare("UPDATE conversations SET lastMessage = ?, lastMessageAt = ? WHERE id = ?")
          .run(content?.substring(0, 200) || '', timestamp || new Date().toISOString(), conversation.id);
      }
      synced++;
    }
    console.log(`📥 [Inbox Sync] Auto-synced ${synced} new messages for user ${userId}`);
  }
}

// Export a singleton instance
module.exports = new ExtensionBridge();
