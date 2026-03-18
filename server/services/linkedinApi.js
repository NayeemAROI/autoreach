/**
 * Server-side LinkedIn API service using cookie injection.
 * Uses LinkedIn's Dash REST API (as of 2025) for messaging.
 * 
 * Working endpoint discovered via browser network capture:
 *   voyagerMessagingDashMessengerConversations?q=syncToken&mailboxUrn=urn:li:fsd_profile:{memberId}
 */

const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const VOYAGER_BASE = 'https://www.linkedin.com/voyager/api';

function getHeaders(li_at, csrf) {
  return {
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'x-li-lang': 'en_US',
    'x-restli-protocol-version': '2.0.0',
    'x-li-track': JSON.stringify({
      clientVersion: '1.13.42903',
      osName: 'web',
      deviceFormFactor: 'DESKTOP',
      mpName: 'voyager-web'
    }),
    'csrf-token': csrf,
    'Cookie': `li_at=${li_at}; JSESSIONID="${csrf}"`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.linkedin.com/messaging/'
  };
}

/**
 * Validate a li_at cookie by fetching the user's own profile.
 * Also extracts memberId needed for messaging API.
 */
async function validateCookie(li_at) {
  const csrf = 'ajax:' + Math.random().toString(36).substring(2, 18);
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
    
    let firstName = '', lastName = '', publicId = '', memberId = '';
    
    // Profile in included array (current format)
    if (data.included && Array.isArray(data.included)) {
      for (const item of data.included) {
        if (item.firstName && item.lastName) {
          firstName = item.firstName;
          lastName = item.lastName;
          publicId = item.publicIdentifier || '';
          // Extract member ID from entityUrn like "urn:li:fs_miniProfile:ACoAAC..."
          memberId = (item.entityUrn || '').split(':').pop();
          break;
        }
      }
    }
    
    // Fallback to direct fields
    if (!firstName) {
      firstName = data.miniProfile?.firstName || data.firstName || '';
      lastName = data.miniProfile?.lastName || data.lastName || '';
      publicId = data.miniProfile?.publicIdentifier || data.publicIdentifier || '';
    }

    return {
      valid: true,
      csrf,
      memberId,
      profileName: `${firstName} ${lastName}`.trim() || 'LinkedIn User',
      profileUrl: publicId ? `https://www.linkedin.com/in/${publicId}` : ''
    };
  } catch (err) {
    return { valid: false, error: `Connection error: ${err.message}` };
  }
}

// Get user's active workspace ID
function getActiveWorkspaceId(userId) {
  const user = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
  return user?.activeWorkspaceId || '';
}

function saveCookie(userId, li_at, csrf, profileName, profileUrl, memberId) {
  const wsId = getActiveWorkspaceId(userId);
  if (wsId) {
    db.prepare(`
      UPDATE workspaces SET 
        linkedin_cookie = ?, linkedin_csrf = ?,
        linkedin_cookie_valid = 1,
        linkedin_profile_name = ?, linkedin_profile_url = ?,
        linkedin_member_id = ?,
        linkedin_connected_at = datetime('now')
      WHERE id = ?
    `).run(li_at, `${csrf}|${memberId}`, profileName, profileUrl, memberId, wsId);
  }
  // Also keep user-level for backward compat
  db.prepare(`
    UPDATE users SET 
      linkedin_cookie = ?, linkedin_csrf = ?,
      linkedin_cookie_valid = 1,
      linkedin_profile_name = ?, linkedin_profile_url = ?,
      linkedin_connected_at = datetime('now')
    WHERE id = ?
  `).run(li_at, `${csrf}|${memberId}`, profileName, profileUrl, userId);
}

function getCookie(userId) {
  // Read from active workspace ONLY — no user-level fallback
  const wsId = getActiveWorkspaceId(userId);
  if (wsId) {
    const ws = db.prepare('SELECT linkedin_cookie, linkedin_csrf, linkedin_cookie_valid, linkedin_profile_name, linkedin_profile_url, linkedin_member_id, linkedin_connected_at FROM workspaces WHERE id = ?').get(wsId);
    if (ws && ws.linkedin_cookie) {
      const parts = (ws.linkedin_csrf || '').split('|');
      return {
        li_at: ws.linkedin_cookie,
        csrf: parts[0] || '',
        memberId: ws.linkedin_member_id || parts[1] || '',
        valid: !!ws.linkedin_cookie_valid,
        profileName: ws.linkedin_profile_name,
        profileUrl: ws.linkedin_profile_url,
        connectedAt: ws.linkedin_connected_at
      };
    }
  }
  return null;
}

function disconnectCookie(userId) {
  const wsId = getActiveWorkspaceId(userId);
  if (wsId) {
    db.prepare(`
      UPDATE workspaces SET 
        linkedin_cookie = '', linkedin_csrf = '',
        linkedin_cookie_valid = 0, linkedin_profile_name = '',
        linkedin_profile_url = '', linkedin_member_id = '',
        linkedin_connected_at = ''
      WHERE id = ?
    `).run(wsId);
  }
  // Also clear user-level
  db.prepare(`
    UPDATE users SET 
      linkedin_cookie = '', linkedin_csrf = '',
      linkedin_cookie_valid = 0, linkedin_profile_name = '',
      linkedin_profile_url = '', linkedin_connected_at = ''
    WHERE id = ?
  `).run(userId);
}

/**
 * Sync inbox — fetches latest conversations + messages.
 * Uses Dash API for conversation list, old events API for messages.
 * Limits to ~50 messages total per sync.
 */
async function syncInbox(userId) {
  const cookie = getCookie(userId);
  if (!cookie || !cookie.valid) {
    throw new Error('No valid LinkedIn cookie. Please connect your account first.');
  }

  if (!cookie.memberId) {
    throw new Error('Missing LinkedIn member ID. Please disconnect and reconnect.');
  }

  const headers = getHeaders(cookie.li_at, cookie.csrf);
  const profileUrn = `urn:li:fsd_profile:${cookie.memberId}`;

  // Step 1: Fetch conversations via Dash API
  console.log(`[LinkedIn API] Fetching conversations for ${cookie.profileName}...`);
  
  const convUrl = `${VOYAGER_BASE}/voyagerMessagingDashMessengerConversations?q=syncToken&mailboxUrn=${encodeURIComponent(profileUrn)}&count=20`;
  
  let convRes;
  try {
    convRes = await fetch(convUrl, { headers });
  } catch (err) {
    throw new Error(`Failed to connect to LinkedIn: ${err.message}`);
  }

  if (convRes.status === 401 || convRes.status === 403) {
    db.prepare('UPDATE users SET linkedin_cookie_valid = 0 WHERE id = ?').run(userId);
    throw new Error('LinkedIn session expired. Please reconnect with a fresh cookie.');
  }

  if (!convRes.ok) {
    throw new Error(`LinkedIn API error: ${convRes.status}`);
  }

  const convData = await convRes.json();
  const included = convData.included || [];
  
  // Extract conversations from included array
  const conversations = included.filter(i => 
    i.$type === 'com.linkedin.messenger.Conversation'
  );

  console.log(`[LinkedIn API] Found ${conversations.length} conversations`);

  let totalMessages = 0;
  let totalConversations = 0;

  // Step 2: For each conversation, fetch events (messages) via old API
  for (const conv of conversations) {

    const convBackendUrn = conv.backendUrn || '';
    // Thread ID is the part after "urn:li:messagingThread:"
    const threadId = convBackendUrn.replace('urn:li:messagingThread:', '');
    if (!threadId) continue;

    // Fetch events (messages) for this conversation
    let events = [];
    let eventProfiles = {};
    try {
      const eventsUrl = `${VOYAGER_BASE}/messaging/conversations/${encodeURIComponent(threadId)}/events?count=40`;
      const eventsRes = await fetch(eventsUrl, { headers });
      
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        const evIncluded = eventsData.included || [];
        
        events = evIncluded.filter(i => 
          i.$type === 'com.linkedin.voyager.messaging.Event'
        );
        
        // Extract profiles from this response
        for (const item of evIncluded) {
          if (item.$type === 'com.linkedin.voyager.identity.shared.MiniProfile' ||
              (item.firstName && item.lastName && item.entityUrn)) {
            const id = (item.entityUrn || '').split(':').pop();
            if (id) {
              eventProfiles[id] = {
                firstName: item.firstName || '',
                lastName: item.lastName || '',
                publicIdentifier: item.publicIdentifier || '',
              };
            }
          }
        }
      }
      
      // Rate limit: small delay between API calls
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.warn(`[LinkedIn API] Failed to fetch events for ${threadId}: ${e.message}`);
      continue;
    }

    // Find participant (not self) from event profiles
    let participantName = '';
    let participantUrl = '';
    
    for (const [id, profile] of Object.entries(eventProfiles)) {
      if (id !== cookie.memberId) {
        participantName = `${profile.firstName} ${profile.lastName}`.trim();
        participantUrl = profile.publicIdentifier ? `https://www.linkedin.com/in/${profile.publicIdentifier}` : '';
        break;
      }
    }

    // Fallback: try creatorUrn from conversation
    if (!participantName && conv.creatorUrn) {
      // creatorUrn format: "urn:li:msg_messagingParticipant:urn:li:fsd_profile:XXX"
      const creatorParts = conv.creatorUrn.split(':');
      const creatorId = creatorParts[creatorParts.length - 1];
      if (creatorId && creatorId !== cookie.memberId) {
        participantName = creatorId.substring(0, 8) + '...'; // short ID as fallback
      }
    }

    if (!participantName) participantName = 'LinkedIn User';

    // Upsert conversation in DB (use threadId as unique identifier)
    let dbConv = db.prepare('SELECT id FROM conversations WHERE user_id = ? AND linkedinThreadId = ?').get(userId, threadId);
    if (!dbConv && participantUrl) {
      dbConv = db.prepare('SELECT id FROM conversations WHERE user_id = ? AND participantUrl = ?').get(userId, participantUrl);
    }
    if (!dbConv && participantName !== 'LinkedIn User') {
      dbConv = db.prepare('SELECT id FROM conversations WHERE user_id = ? AND participantName = ?').get(userId, participantName);
    }
    if (!dbConv) {
      const cId = uuidv4();
      const pUrl = participantUrl || `linkedin:${threadId}`;
      db.prepare("INSERT INTO conversations (id, user_id, participantName, participantUrl, linkedinThreadId, lastMessage, lastMessageAt, unreadCount) VALUES (?, ?, ?, ?, ?, '', datetime('now'), 0)")
        .run(cId, userId, participantName, pUrl, threadId);
      dbConv = { id: cId };
      totalConversations++;
    } else {
      // Always update threadId and name
      db.prepare("UPDATE conversations SET linkedinThreadId = ? WHERE id = ? AND (linkedinThreadId = '' OR linkedinThreadId IS NULL)").run(threadId, dbConv.id);
      if (participantName !== 'LinkedIn User') {
        db.prepare('UPDATE conversations SET participantName = ? WHERE id = ?').run(participantName, dbConv.id);
      }
    }

    // Process events as messages
    let lastMsg = '';
    let lastMsgAt = null;
    let unread = 0;

    for (const event of events) {


      // Extract message body from event
      const eventContent = event.eventContent || {};
      const msgBody = eventContent.body || eventContent.attributedBody?.text || event.body || '';
      const content = typeof msgBody === 'object' ? (msgBody.text || JSON.stringify(msgBody)) : msgBody;
      if (!content) continue;

      const linkedinMsgId = event.entityUrn || event.backendUrn || `${threadId}_${event.createdAt || Date.now()}`;
      const timestamp = event.createdAt ? new Date(event.createdAt).toISOString() : new Date().toISOString();

      // Determine direction from sender
      // LinkedIn uses *from (REST.li entity ref) with format:
      //   urn:li:fs_messagingMember:(threadId,memberId)
      const fromUrn = event['*from'] || '';
      // Extract memberId - it's after the last comma in the URN
      const commaIdx = fromUrn.lastIndexOf(',');
      const fromMemberId = commaIdx >= 0 ? fromUrn.substring(commaIdx + 1).replace(')', '') : '';
      const isFromMe = fromMemberId && cookie.memberId && fromMemberId === cookie.memberId;
      const direction = isFromMe ? 'outbound' : 'inbound';
      
      if (totalMessages < 3) {
        console.log(`[LinkedIn API] Msg direction: fromMemberId=${fromMemberId}, me=${cookie.memberId}, dir=${direction}`);
      }

      // Dedup
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
    const displayTime = lastMsgAt || (conv.lastActivityAt ? new Date(conv.lastActivityAt).toISOString() : new Date().toISOString());
    db.prepare('UPDATE conversations SET lastMessage = ?, lastMessageAt = ?, unreadCount = ? WHERE id = ?')
      .run((lastMsg || '').substring(0, 200), displayTime, conv.unreadCount || unread, dbConv.id);
  }

  console.log(`[LinkedIn API] Synced ${totalMessages} messages across ${totalConversations} new conversations`);
  return { conversations: totalConversations, messages: totalMessages };
}

/**
 * Send a message to a LinkedIn conversation.
 * Uses the old Voyager messaging events API.
 */
async function sendMessage(userId, conversationId, content) {
  const cookie = getCookie(userId);
  if (!cookie || !cookie.valid) {
    throw new Error('No valid LinkedIn cookie.');
  }

  // Get conversation to find the threadId
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?').get(conversationId, userId);
  if (!conv) throw new Error('Conversation not found');

  // Get threadId from dedicated column or fallback to participantUrl
  let threadId = conv.linkedinThreadId || '';
  if (!threadId && conv.participantUrl?.startsWith('linkedin:')) {
    threadId = conv.participantUrl.replace('linkedin:', '');
  }

  if (!threadId) {
    throw new Error('Cannot send message: no LinkedIn thread ID found. Please sync your inbox first to link this conversation.');
  }

  const headers = getHeaders(cookie.li_at, cookie.csrf);
  headers['Content-Type'] = 'application/json; charset=UTF-8';

  const body = {
    eventCreate: {
      value: {
        'com.linkedin.voyager.messaging.create.MessageCreate': {
          body: content,
          attachments: [],
          attributedBody: {
            text: content,
            attributes: []
          }
        }
      }
    }
  };

  const url = `${VOYAGER_BASE}/messaging/conversations/${encodeURIComponent(threadId)}/events`;
  console.log(`[LinkedIn API] Sending message to thread ${threadId.substring(0, 20)}...`);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (res.status === 401 || res.status === 403) {
    db.prepare('UPDATE users SET linkedin_cookie_valid = 0 WHERE id = ?').run(userId);
    throw new Error('LinkedIn session expired. Please reconnect.');
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[LinkedIn API] Send failed: ${res.status} - ${text.substring(0, 200)}`);
    throw new Error(`Failed to send message (${res.status})`);
  }

  console.log(`[LinkedIn API] Message sent successfully`);
  return { success: true };
}

module.exports = { validateCookie, saveCookie, getCookie, disconnectCookie, syncInbox, sendMessage };
