/**
 * Server-side LinkedIn API service using cookie injection.
 * Uses LinkedIn's Dash REST API (as of 2025) for messaging.
 * 
 * Working endpoint discovered via browser network capture:
 *   voyagerMessagingDashMessengerConversations?q=syncToken&mailboxUrn=urn:li:fsd_profile:{memberId}
 */

const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');

const VOYAGER_BASE = 'https://www.linkedin.com/voyager/api';

/**
 * Wrapper around fetch that handles LinkedIn redirects properly.
 * LinkedIn redirects to login page when auth fails — we catch that instead of following.
 */
async function linkedinFetch(url, options = {}) {
  const res = await fetch(url, { ...options, redirect: 'manual' });
  
  // LinkedIn redirects to login when auth fails (302/301)
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || '';
    console.error(`[LinkedIn API] Redirected to: ${location}`);
    const error = new Error('LinkedIn session expired (redirected to login)');
    error.status = 401;
    throw error;
  }
  
  return res;
}

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
    const res = await linkedinFetch(`${VOYAGER_BASE}/me`, { headers });

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
    convRes = await linkedinFetch(convUrl, { headers });
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
      const eventsRes = await linkedinFetch(eventsUrl, { headers });
      
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
      const wsId = getActiveWorkspaceId(userId);
      db.prepare("INSERT INTO conversations (id, user_id, workspace_id, participantName, participantUrl, linkedinThreadId, lastMessage, lastMessageAt, unreadCount) VALUES (?, ?, ?, ?, ?, ?, '', datetime('now'), 0)")
        .run(cId, userId, wsId, participantName, pUrl, threadId);
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

  console.log(`[LinkedIn API] Sending message to thread ${threadId.substring(0, 20)}...`);

  // Try Method 1: Dash Messenger API (current LinkedIn format)
  try {
    const dashBody = {
      message: {
        body: {
          text: content,
          attributes: []
        },
        renderContentUnions: [],
        conversationUrn: `urn:li:messagingThread:${threadId}`,
        originToken: uuidv4()
      },
      mailboxUrn: `urn:li:fsd_profile:${cookie.memberId}`,
      trackingId: uuidv4().replace(/-/g, '').substring(0, 16)
    };

    const dashHeaders = { ...headers };
    dashHeaders['Accept'] = 'application/vnd.linkedin.normalized+json+2.1';

    const dashUrl = `${VOYAGER_BASE}/voyagerMessagingDashMessengerMessages?action=createMessage`;
    const dashRes = await linkedinFetch(dashUrl, {
      method: 'POST',
      headers: dashHeaders,
      body: JSON.stringify(dashBody)
    });

    if (dashRes.ok || dashRes.status === 201) {
      console.log(`[LinkedIn API] ✅ Message sent via Dash API`);
      return { success: true };
    }

    // If Dash fails with auth error
    if (dashRes.status === 401 || dashRes.status === 403) {
      const wsId = getActiveWorkspaceId(userId);
      if (wsId) db.prepare('UPDATE workspaces SET linkedin_cookie_valid = 0 WHERE id = ?').run(wsId);
      throw new Error('LinkedIn session expired. Please reconnect.');
    }

    const dashErr = await dashRes.text();
    console.warn(`[LinkedIn API] Dash API failed (${dashRes.status}), trying legacy API... Detail: ${dashErr.substring(0, 100)}`);
  } catch (err) {
    if (err.message.includes('expired')) throw err;
    console.warn(`[LinkedIn API] Dash API error: ${err.message}, trying legacy...`);
  }

  // Try Method 2: Legacy events API (fallback)
  const legacyBody = {
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

  const legacyUrl = `${VOYAGER_BASE}/messaging/conversations/${encodeURIComponent(threadId)}/events`;
  const res = await linkedinFetch(legacyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(legacyBody)
  });

  if (res.status === 401 || res.status === 403) {
    const wsId = getActiveWorkspaceId(userId);
    if (wsId) db.prepare('UPDATE workspaces SET linkedin_cookie_valid = 0 WHERE id = ?').run(wsId);
    throw new Error('LinkedIn session expired. Please reconnect.');
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[LinkedIn API] Legacy send failed: ${res.status} - ${text.substring(0, 300)}`);
    throw new Error(`Failed to send message (${res.status})`);
  }

  console.log(`[LinkedIn API] ✅ Message sent via Legacy API`);
  return { success: true };
}

/**
 * Send a connection request to a LinkedIn profile.
 * Uses Voyager API directly — no Chrome extension needed.
 */
async function sendConnectionRequest(userId, profileUrl, message = '') {
  const cookie = getCookie(userId);
  if (!cookie || !cookie.valid) {
    throw new Error('No valid LinkedIn cookie. Please connect your account first.');
  }

  const headers = getHeaders(cookie.li_at, cookie.csrf);

  // Step 1: Get the target profile's memberId from their public URL
  const publicId = profileUrl.replace(/.*linkedin\.com\/in\//i, '').replace(/[/?#].*/, '');
  if (!publicId) throw new Error('Invalid LinkedIn profile URL');

  let targetMemberId = '';

  // Helper: extract memberId from included items
  function extractMemberId(included) {
    for (const item of included) {
      const urn = item.entityUrn || item.objectUrn || '';
      if (urn.includes('fsd_profile:') || urn.includes('member:') || urn.includes('miniProfile:')) {
        const id = urn.split(':').pop();
        if (id && /^\d+$/.test(id)) return id;
      }
      if (item.$type && item.$type.includes('MiniProfile') && item.entityUrn) {
        const id = item.entityUrn.split(':').pop();
        if (id && /^\d+$/.test(id)) return id;
      }
    }
    return '';
  }

  // Try multiple endpoints (LinkedIn deprecates them frequently)
  const endpoints = [
    `${VOYAGER_BASE}/identity/profiles/${encodeURIComponent(publicId)}`,
    `${VOYAGER_BASE}/identity/dash/profiles?q=memberIdentity&memberIdentity=${encodeURIComponent(publicId)}`,
    `${VOYAGER_BASE}/identity/profiles/${encodeURIComponent(publicId)}/profileView`,
    `${VOYAGER_BASE}/identity/profiles/${encodeURIComponent(publicId)}/networkinfo`,
  ];

  for (const endpoint of endpoints) {
    try {
      const profileRes = await linkedinFetch(endpoint, { headers });
      
      if (profileRes.status === 401 || profileRes.status === 403) {
        const wsId = getActiveWorkspaceId(userId);
        if (wsId) db.prepare('UPDATE workspaces SET linkedin_cookie_valid = 0 WHERE id = ?').run(wsId);
        throw new Error('LinkedIn session expired. Please reconnect with a fresh cookie.');
      }
      
      if (profileRes.status === 410 || profileRes.status === 404) {
        console.warn(`[LinkedIn API] Endpoint returned ${profileRes.status}: ${endpoint}`);
        continue; // Try next endpoint
      }
      
      if (!profileRes.ok) {
        console.warn(`[LinkedIn API] Endpoint returned ${profileRes.status}: ${endpoint}`);
        continue;
      }

      const profileData = await profileRes.json();
      const included = profileData.included || [];
      targetMemberId = extractMemberId(included);
      
      // Also check top-level
      if (!targetMemberId && profileData.entityUrn) {
        targetMemberId = profileData.entityUrn.split(':').pop();
      }
      if (!targetMemberId && profileData.miniProfile?.entityUrn) {
        targetMemberId = profileData.miniProfile.entityUrn.split(':').pop();
      }

      if (targetMemberId) {
        console.log(`[LinkedIn API] Got memberId ${targetMemberId} from ${endpoint.split('/api/')[1]?.substring(0, 40)}`);
        break;
      }
    } catch (err) {
      if (err.message.includes('expired')) throw err;
      console.warn(`[LinkedIn API] Endpoint error (${endpoint.split('/api/')[1]?.substring(0, 40)}): ${err.message}`);
    }
  }

  // Fallback: Scrape the actual LinkedIn profile page for memberId
  if (!targetMemberId) {
    try {
      console.log(`[LinkedIn API] All API endpoints failed, trying page scraping for ${publicId}...`);
      const pageHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `li_at=${cookie.li_at}; JSESSIONID="${cookie.csrf}"`,
      };
      
      const pageRes = await fetch(`https://www.linkedin.com/in/${encodeURIComponent(publicId)}/`, {
        headers: pageHeaders,
        redirect: 'manual',
      });

      if (pageRes.status >= 300 && pageRes.status < 400) {
        console.warn('[LinkedIn API] Page scrape redirected — session may be expired');
      } else if (pageRes.ok) {
        const html = await pageRes.text();
        
        // Extract memberId from various patterns in page source
        const patterns = [
          /urn:li:fsd_profile:(\d+)/,
          /urn:li:member:(\d+)/,
          /"publicIdentifier":"[^"]+","memberUrn":"urn:li:member:(\d+)"/,
          /"entityUrn":"urn:li:fs_miniProfile:[^"]*?(\d{5,})"/,
          /profileId['":\s]+(\d{5,})/,
          /"objectUrn":"urn:li:member:(\d+)"/,
        ];

        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match && match[1]) {
            targetMemberId = match[1];
            console.log(`[LinkedIn API] Got memberId ${targetMemberId} via page scraping (pattern: ${pattern.source.substring(0, 30)})`);
            break;
          }
        }
      }
    } catch (err) {
      console.error(`[LinkedIn API] Page scraping failed: ${err.message}`);
    }
  }

  if (!targetMemberId) throw new Error('Could not find target member ID from any source');

  // Step 2: Send connection invitation
  headers['Content-Type'] = 'application/json; charset=UTF-8';

  const invitePayload = {
    trackingId: uuidv4().replace(/-/g, '').substring(0, 16),
    message: message || '',
    invitations: [],
    excludeInvitations: [],
    invitee: {
      'com.linkedin.voyager.growth.invitation.InviteeProfile': {
        profileId: targetMemberId
      }
    }
  };

  const inviteUrl = `${VOYAGER_BASE}/growth/normInvitations`;
  
  console.log(`[LinkedIn API] Sending connection request to ${publicId} (${targetMemberId})...`);
  
  const res = await linkedinFetch(inviteUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(invitePayload)
  });

  if (res.status === 401 || res.status === 403) {
    const wsId = getActiveWorkspaceId(userId);
    if (wsId) db.prepare('UPDATE workspaces SET linkedin_cookie_valid = 0 WHERE id = ?').run(wsId);
    throw new Error('LinkedIn session expired. Please reconnect.');
  }

  if (res.status === 429) {
    throw new Error('LinkedIn rate limit reached. Try again later.');
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`[LinkedIn API] Connection request failed: ${res.status} - ${text.substring(0, 200)}`);
    throw new Error(`Connection request failed (${res.status})`);
  }

  console.log(`[LinkedIn API] ✅ Connection request sent to ${publicId}`);
  return { success: true, targetMemberId };
}

/**
 * View/fetch a LinkedIn profile (simulates profile visit).
 */
async function viewProfile(userId, profileUrl) {
  const cookie = getCookie(userId);
  if (!cookie || !cookie.valid) {
    throw new Error('No valid LinkedIn cookie.');
  }

  const publicId = profileUrl.replace(/.*linkedin\.com\/in\//i, '').replace(/[/?#].*/, '');
  if (!publicId) throw new Error('Invalid LinkedIn profile URL');

  const headers = getHeaders(cookie.li_at, cookie.csrf);

  // Try modern endpoint first, fallback to legacy
  const profileEndpoints = [
    `${VOYAGER_BASE}/identity/profiles/${encodeURIComponent(publicId)}`,
    `${VOYAGER_BASE}/identity/profiles/${encodeURIComponent(publicId)}/profileView`,
  ];

  for (const endpoint of profileEndpoints) {
    const res = await linkedinFetch(endpoint, { headers });

    if (res.status === 401 || res.status === 403) {
      const wsId = getActiveWorkspaceId(userId);
      if (wsId) db.prepare('UPDATE workspaces SET linkedin_cookie_valid = 0 WHERE id = ?').run(wsId);
      throw new Error('LinkedIn session expired.');
    }

    if (res.status === 410 || res.status === 404) {
      console.warn(`[LinkedIn API] viewProfile endpoint returned ${res.status}, trying next...`);
      continue;
    }

    if (!res.ok) continue;

    const data = await res.json();
    console.log(`[LinkedIn API] ✅ Viewed profile: ${publicId}`);
    return { success: true, data };
  }

  throw new Error('All profile view endpoints failed');
}

/**
 * Send a direct message to a LinkedIn connection.
 * Only works if already connected with the target.
 */
async function sendDirectMessage(userId, profileUrl, messageText) {
  const cookie = getCookie(userId);
  if (!cookie || !cookie.valid) {
    throw new Error('No valid LinkedIn cookie.');
  }

  const publicId = profileUrl.replace(/.*linkedin\.com\/in\//i, '').replace(/[/?#].*/, '');
  if (!publicId) throw new Error('Invalid LinkedIn profile URL');

  const headers = getHeaders(cookie.li_at, cookie.csrf);

  // Get target memberId
  let targetMemberId = '';
  const profileRes = await linkedinFetch(`${VOYAGER_BASE}/identity/profiles/${encodeURIComponent(publicId)}/profileView`, { headers });
  if (profileRes.ok) {
    const profileData = await profileRes.json();
    for (const item of (profileData.included || [])) {
      if (item.entityUrn && item.firstName) {
        targetMemberId = (item.entityUrn || '').split(':').pop();
        if (targetMemberId) break;
      }
    }
  }

  if (!targetMemberId) throw new Error('Could not find target member ID');

  // Create new conversation with message
  headers['Content-Type'] = 'application/json; charset=UTF-8';

  const msgPayload = {
    keyVersion: 'LEGACY_INBOX',
    conversationCreate: {
      eventCreate: {
        value: {
          'com.linkedin.voyager.messaging.create.MessageCreate': {
            body: messageText,
            attachments: [],
            attributedBody: { text: messageText, attributes: [] }
          }
        }
      },
      recipients: [`urn:li:fs_miniProfile:${targetMemberId}`],
      subtype: 'MEMBER_TO_MEMBER'
    }
  };

  const res = await linkedinFetch(`${VOYAGER_BASE}/messaging/conversations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(msgPayload)
  });

  if (res.status === 401 || res.status === 403) {
    const wsId = getActiveWorkspaceId(userId);
    if (wsId) db.prepare('UPDATE workspaces SET linkedin_cookie_valid = 0 WHERE id = ?').run(wsId);
    throw new Error('LinkedIn session expired.');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Message send failed (${res.status}): ${text.substring(0, 100)}`);
  }

  console.log(`[LinkedIn API] ✅ Message sent to ${publicId}`);
  return { success: true };
}

module.exports = { 
  validateCookie, saveCookie, getCookie, disconnectCookie, 
  syncInbox, sendMessage,
  sendConnectionRequest, viewProfile, sendDirectMessage
};
