const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(auth);

// GET /api/inbox - list all conversations for user
router.get('/', (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT c.*, l.firstName, l.lastName, l.company, l.linkedinUrl
      FROM conversations c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.user_id = ?
      ORDER BY c.lastMessageAt DESC
    `).all(req.user.id);

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    res.json({ conversations, totalUnread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inbox/:id - get conversation with messages
router.get('/:id', (req, res) => {
  try {
    const conversation = db.prepare(`
      SELECT c.*, l.firstName, l.lastName, l.company, l.linkedinUrl
      FROM conversations c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.id = ? AND c.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY createdAt ASC
    `).all(req.params.id);

    // Mark as read
    db.prepare("UPDATE messages SET isRead = 1 WHERE conversation_id = ? AND direction = 'inbound'").run(req.params.id);
    db.prepare("UPDATE conversations SET unreadCount = 0 WHERE id = ?").run(req.params.id);

    res.json({ conversation, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/:id/reply - send reply in conversation
router.post('/:id/reply', (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });

  try {
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const msgId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, user_id, direction, content, senderName)
      VALUES (?, ?, ?, 'outbound', ?, ?)
    `).run(msgId, req.params.id, req.user.id, content.trim(), req.user.name || 'You');

    // Update conversation
    db.prepare("UPDATE conversations SET lastMessage = ?, lastMessageAt = datetime('now') WHERE id = ?")
      .run(content.trim().substring(0, 200), req.params.id);

    // TODO: Dispatch message via extension WebSocket
    const { getClients } = require('../services/linkedinBridge');
    const clients = getClients(req.user.id);
    if (clients?.length > 0) {
      clients[0].send(JSON.stringify({
        type: 'SEND_MESSAGE',
        payload: {
          profileUrl: conversation.participantUrl,
          message: content.trim()
        }
      }));
    }

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/sync - sync messages from extension
router.post('/sync', (req, res) => {
  const { messages: incomingMessages } = req.body;
  if (!Array.isArray(incomingMessages)) return res.status(400).json({ error: 'messages must be an array' });

  let synced = 0;
  const userId = req.user.id;

  try {
    for (const msg of incomingMessages) {
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
        // Try to link to existing lead
        const lead = db.prepare('SELECT id FROM leads WHERE linkedinUrl = ? AND user_id = ?').get(participantUrl, userId);

        db.prepare(`
          INSERT INTO conversations (id, user_id, lead_id, participantName, participantUrl, lastMessage, lastMessageAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(convId, userId, lead?.id || null, participantName || '', participantUrl || '', content?.substring(0, 200) || '', timestamp || new Date().toISOString());

        conversation = { id: convId };
      }

      // Insert message
      db.prepare(`
        INSERT INTO messages (id, conversation_id, user_id, direction, content, senderName, linkedinMessageId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), conversation.id, userId, direction, content || '', direction === 'inbound' ? participantName : 'You', linkedinMessageId || '', timestamp || new Date().toISOString());

      // Update conversation
      if (direction === 'inbound') {
        db.prepare("UPDATE conversations SET lastMessage = ?, lastMessageAt = ?, unreadCount = unreadCount + 1 WHERE id = ?")
          .run(content?.substring(0, 200) || '', timestamp || new Date().toISOString(), conversation.id);
      } else {
        db.prepare("UPDATE conversations SET lastMessage = ?, lastMessageAt = ? WHERE id = ?")
          .run(content?.substring(0, 200) || '', timestamp || new Date().toISOString(), conversation.id);
      }

      synced++;
    }

    res.json({ synced, total: incomingMessages.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inbox/trigger-sync - trigger extension to sync LinkedIn inbox
router.post('/trigger-sync', (req, res) => {
  try {
    const bridge = require('../services/linkedinBridge');
    const sent = bridge.syncInbox(req.user.id);
    if (sent) {
      res.json({ message: 'Sync command sent to extension. Messages will appear shortly.' });
    } else {
      res.status(503).json({ error: 'Extension not connected. Please open the Chrome extension.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inbox/:id - delete conversation
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
    db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
