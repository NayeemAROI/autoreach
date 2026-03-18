/**
 * Server-side LinkedIn API service using cookie injection.
 * Same approach as Phantombuster - uses the user's li_at cookie to call Voyager API.
 */

const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const VOYAGER_BASE = 'https://www.linkedin.com/voyager/api';

function getHeaders(li_at, csrf) {
  return {
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'x-li-lang': 'en_US',
    'x-restli-protocol-version': '2.0.0',
    'csrf-token': csrf,
    'Cookie': `li_at=${li_at}; JSESSIONID="${csrf}"`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
}

/**
 * Validate a li_at cookie by fetching the user's own profile.
 * Returns { valid, profileName, profileUrl } or throws.
 */
async function validateCookie(li_at) {
  // Extract CSRF token from li_at (common pattern) or generate a simple one
  const csrf = 'ajax:' + Math.random().toString(36).substring(2, 12);
  const headers = getHeaders(li_at, csrf);

  try {
    const res = await fetch(`${VOYAGER_BASE}/me`, { headers });

    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: 'Cookie expired or invalid. Please get a fresh li_at cookie.' };
    }

    if (!res.ok) {
      return { valid: false, error: `LinkedIn returned status ${res.status}` };
    }

    const data = await res.json();
    const firstName = data.miniProfile?.firstName || data.firstName || '';
    const lastName = data.miniProfile?.lastName || data.lastName || '';
    const publicId = data.miniProfile?.publicIdentifier || data.publicIdentifier || '';

    return {
      valid: true,
      csrf,
      profileName: `${firstName} ${lastName}`.trim() || 'LinkedIn User',
      profileUrl: publicId ? `https://www.linkedin.com/in/${publicId}` : ''
    };
  } catch (err) {
    return { valid: false, error: `Connection error: ${err.message}` };
  }
}

/**
 * Save a validated cookie for a user.
 */
function saveCookie(userId, li_at, csrf, profileName, profileUrl) {
  db.prepare(`
    UPDATE users SET 
      linkedin_cookie = ?, 
      linkedin_csrf = ?,
      linkedin_cookie_valid = 1,
      linkedin_profile_name = ?,
      linkedin_profile_url = ?,
      linkedin_connected_at = datetime('now')
    WHERE id = ?
  `).run(li_at, csrf, profileName, profileUrl, userId);
}

/**
 * Get stored cookie for a user.
 */
function getCookie(userId) {
  const user = db.prepare('SELECT linkedin_cookie, linkedin_csrf, linkedin_cookie_valid, linkedin_profile_name, linkedin_profile_url, linkedin_connected_at FROM users WHERE id = ?').get(userId);
  if (!user || !user.linkedin_cookie) return null;
  return {
    li_at: user.linkedin_cookie,
    csrf: user.linkedin_csrf,
    valid: !!user.linkedin_cookie_valid,
    profileName: user.linkedin_profile_name,
    profileUrl: user.linkedin_profile_url,
    connectedAt: user.linkedin_connected_at
  };
}

/**
 * Disconnect - clear stored cookie.
 */
function disconnectCookie(userId) {
  db.prepare(`
    UPDATE users SET 
      linkedin_cookie = '', 
      linkedin_csrf = '',
      linkedin_cookie_valid = 0,
      linkedin_profile_name = '',
      linkedin_profile_url = '',
      linkedin_connected_at = ''
    WHERE id = ?
  `).run(userId);
}

/**
 * Fetch conversations and messages from LinkedIn using stored cookie.
 * Returns { conversations: number, messages: number } count of synced items.
 */
async function syncInbox(userId) {
  const cookie = getCookie(userId);
  if (!cookie || !cookie.valid) {
    throw new Error('No valid LinkedIn cookie. Please connect your account first.');
  }

  const headers = getHeaders(cookie.li_at, cookie.csrf);

  // Fetch conversations
  let convData;
  try {
    const res = await fetch(`${VOYAGER_BASE}/messaging/conversations?keyVersion=LEGACY_INBOX`, { headers });
    if (res.status === 401 || res.status === 403) {
      // Mark cookie as invalid
      db.prepare('UPDATE users SET linkedin_cookie_valid = 0 WHERE id = ?').run(userId);
      throw new Error('LinkedIn session expired. Please reconnect with a fresh cookie.');
    }
    if (!res.ok) {
      // Try alternate endpoint
      const altRes = await fetch(`${VOYAGER_BASE}/messaging/conversations`, { headers });
      if (!altRes.ok) throw new Error(`LinkedIn API error: ${altRes.status}`);
      convData = await altRes.json();
    } else {
      convData = await res.json();
    }
  } catch (err) {
    if (err.message.includes('session expired') || err.message.includes('reconnect')) throw err;
    throw new Error(`Failed to fetch conversations: ${err.message}`);
  }

  const conversations = convData.elements || [];
  const included = convData.included || [];
  let totalMessages = 0;
  let totalConversations = 0;

  console.log(`[LinkedIn API] Found ${conversations.length} conversations, ${included.length} included entities`);

  for (const conv of conversations.slice(0, 20)) {
    const convUrn = conv.entityUrn || conv['*conversation'] || '';
    const convId = convUrn.split(':').pop();
    if (!convId) continue;

    // Extract participant info
    let participantName = '';
    let participantUrl = '';
    const participants = conv.participants || [];

    for (const p of participants) {
      const memberUrn = typeof p === 'string' ? p :
        p['com.linkedin.voyager.messaging.MessagingMember']?.miniProfile?.entityUrn ||
        p.miniProfile?.entityUrn || p['*miniProfile'] || p.entityUrn || '';
      const profileId = memberUrn.split(':').pop();

      const profile = included.find(i =>
        (i.$type === 'com.linkedin.voyager.identity.shared.MiniProfile' ||
         i.$type === 'com.linkedin.voyager.messaging.MessagingMember' ||
         i.firstName) &&
        (i.publicIdentifier === profileId ||
         i.entityUrn?.includes(profileId) ||
         i['*miniProfile']?.includes(profileId))
      );

      if (profile && profile.firstName) {
        participantName = `${profile.firstName} ${profile.lastName || ''}`.trim();
        participantUrl = `https://www.linkedin.com/in/${profile.publicIdentifier || profileId}`;
        break;
      }
    }

    // Fallback participant name
    if (!participantName && included.length > 0) {
      const convMember = included.find(i =>
        i.$type?.includes('MessagingMember') && i.entityUrn?.includes(convId)
      );
      if (convMember) {
        const mp = included.find(i =>
          i.$type?.includes('MiniProfile') &&
          convMember['*miniProfile']?.includes(i.entityUrn?.split(':').pop())
        );
        if (mp) {
          participantName = `${mp.firstName} ${mp.lastName || ''}`.trim();
          participantUrl = `https://www.linkedin.com/in/${mp.publicIdentifier}`;
        }
      }
    }

    if (!participantName) participantName = 'Unknown';

    // Fetch messages for this conversation
    try {
      const msgRes = await fetch(`${VOYAGER_BASE}/messaging/conversations/${convId}/events?count=10`, { headers });
      if (!msgRes.ok) continue;

      const msgData = await msgRes.json();
      const events = msgData.elements || [];

      // Upsert conversation
      let dbConv = db.prepare('SELECT id FROM conversations WHERE user_id = ? AND participantUrl = ?').get(userId, participantUrl);
      if (!dbConv) {
        const cId = uuidv4();
        db.prepare('INSERT INTO conversations (id, user_id, participantName, participantUrl, lastMessage, lastMessageAt, unreadCount) VALUES (?, ?, ?, ?, ?, datetime(\'now\'), 0)')
          .run(cId, userId, participantName, participantUrl, '');
        dbConv = { id: cId };
        totalConversations++;
      } else {
        db.prepare('UPDATE conversations SET participantName = ? WHERE id = ?').run(participantName, dbConv.id);
      }

      let lastMsg = '';
      let lastMsgAt = null;
      let unread = 0;

      for (const evt of events) {
        const body = evt.eventContent?.['com.linkedin.voyager.messaging.event.MessageEvent'];
        if (!body) continue;

        const content = body.body || body.attributedBody?.text || '';
        const linkedinMsgId = evt.entityUrn || `${convId}_${evt.createdAt}`;
        const timestamp = evt.createdAt ? new Date(evt.createdAt).toISOString() : new Date().toISOString();

        // Determine direction
        const senderUrn = evt.from?.['com.linkedin.voyager.messaging.MessagingMember']?.miniProfile?.entityUrn ||
          evt.from?.miniProfile?.entityUrn || evt.from?.entityUrn || '';
        const myUrn = conv.hostUrn || conv['*hostProfile'] || '';
        const isFromMe = myUrn && senderUrn.includes(myUrn.split(':').pop());
        const direction = isFromMe ? 'outbound' : 'inbound';

        // Check if message already exists (dedup)
        const existing = db.prepare('SELECT id FROM messages WHERE linkedinMessageId = ? AND conversation_id = ?').get(linkedinMsgId, dbConv.id);
        if (!existing) {
          const msgId = uuidv4();
          db.prepare('INSERT INTO messages (id, conversation_id, user_id, direction, content, senderName, linkedinMessageId, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)')
            .run(msgId, dbConv.id, userId, direction, content, direction === 'inbound' ? participantName : cookie.profileName, linkedinMsgId, timestamp);
          totalMessages++;
          if (direction === 'inbound') unread++;
        }

        if (!lastMsgAt || new Date(timestamp) > new Date(lastMsgAt)) {
          lastMsg = content;
          lastMsgAt = timestamp;
        }
      }

      // Update conversation metadata
      if (lastMsg) {
        db.prepare('UPDATE conversations SET lastMessage = ?, lastMessageAt = ?, unreadCount = unreadCount + ? WHERE id = ?')
          .run(lastMsg.substring(0, 200), lastMsgAt, unread, dbConv.id);
      }
    } catch (e) {
      console.warn(`[LinkedIn API] Failed to fetch messages for conv ${convId}:`, e.message);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[LinkedIn API] Synced ${totalMessages} messages across ${totalConversations} new conversations`);
  return { conversations: totalConversations, messages: totalMessages };
}

module.exports = { validateCookie, saveCookie, getCookie, disconnectCookie, syncInbox };
