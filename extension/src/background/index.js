let ws = null;
let reconnectTimer = null;
let keepaliveInterval = null;
let authToken = null;
const WS_BASE_URL = 'ws://127.0.0.1:3001';

// LinkedIn Session State
const session = {
  li_at: null,
  JSESSIONID: null
};

// Initialize on Service Worker wake
chrome.storage.local.get(['outreach_token'], (res) => {
  if (res.outreach_token) {
    authToken = res.outreach_token;
    console.log('[Automation Bridge] Token loaded on wake, trying to connect...');
    connect();
  }
});

// Listen for token updates from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATUS') {
    sendResponse({
      wsStatus: ws ? (ws.readyState === WebSocket.OPEN ? 'connected' : (ws.readyState === WebSocket.CONNECTING ? 'connecting' : 'disconnected')) : 'disconnected',
      error: lastConnectError,
      hasToken: !!authToken,
      attempts: connectAttempts
    });
    return true;
  }
  else if (request.type === 'TOKEN_UPDATED') {
    if (request.token) {
      chrome.storage.local.set({ outreach_token: request.token }, () => {
        authToken = request.token;
        console.log('[Automation Bridge] Auto-synced token from Web App, reconnecting...');
        if (ws) ws.close(); else connect();
      });
    } else {
      chrome.storage.local.get(['outreach_token'], (res) => {
        authToken = res.outreach_token;
        console.log('[Automation Bridge] Token updated, reconnecting...');
        if (ws) ws.close(); else connect();
      });
    }
  } else if (request.type === 'ACTION_COMPLETED' || request.type === 'ACTION_FAILED' || request.type === 'PROFILE_DATA' || request.type === 'MESSAGES_DATA') {
    // Forward from Content Script to backend
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(request));
    }
  }
});

// 1. WebSocket Connection Management
let lastConnectError = '';
let connectAttempts = 0;

function connect() {
  if (!authToken) {
    lastConnectError = 'No auth token';
    console.log('[Automation Bridge] Waiting for API Key to be set in Popup...');
    return;
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  connectAttempts++;
  console.log(`[Automation Bridge] Connection attempt #${connectAttempts} to ${WS_BASE_URL}...`);
  
  try {
    ws = new WebSocket(`${WS_BASE_URL}?token=${authToken}`);
  } catch (err) {
    console.error('[Automation Bridge] WebSocket constructor failed:', err.message);
    lastConnectError = `Constructor: ${err.message}`;
    reconnectTimer = setTimeout(connect, 5000);
    return;
  }

  // Set a timeout - if still CONNECTING after 5s, something is wrong
  const connectTimeout = setTimeout(() => {
    if (ws && ws.readyState === WebSocket.CONNECTING) {
      console.error('[Automation Bridge] Connection timeout after 5s');
      lastConnectError = 'Connection timeout - server may be unreachable';
      try { ws.close(); } catch(e) {}
    }
  }, 5000);

  ws.onopen = () => {
    clearTimeout(connectTimeout);
    connectAttempts = 0;
    lastConnectError = '';
    console.log('[Automation Bridge] ✅ Connected to backend!');
    clearTimeout(reconnectTimer);
    clearInterval(keepaliveInterval);
    keepaliveInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 20000);
    updateIcon(true);
    sendSessionToBackend();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleCommand(msg);
    } catch (e) {
      console.error('Failed to parse message', e);
    }
  };

  ws.onclose = (event) => {
    clearTimeout(connectTimeout);
    console.log(`[Automation Bridge] Disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
    clearInterval(keepaliveInterval);
    updateIcon(false);
    
    // If server rejected our token (1008), clear it
    if (event.code === 1008) {
      lastConnectError = 'Auth rejected - token may be expired. Use manual token or re-login to web app.';
      console.error('[Automation Bridge] Token rejected by server. Clearing stale token.');
      authToken = null;
      chrome.storage.local.remove('outreach_token');
      // Don't reconnect with a bad token
      return;
    }
    
    lastConnectError = `Disconnected (code: ${event.code})`;
    const delay = Math.min(3000 * connectAttempts, 15000); // Backoff: 3s, 6s, 9s... max 15s
    reconnectTimer = setTimeout(connect, delay);
  };

  ws.onerror = (err) => {
    clearTimeout(connectTimeout);
    console.error('[Automation Bridge] WebSocket error event fired');
    lastConnectError = 'Connection error - check if server is running on port 3001';
    clearInterval(keepaliveInterval);
    try { ws.close(); } catch(e) {}
  };
}

function updateIcon(isConnected) {
  const path = isConnected ? {
    "16": "/images/icon-16.png",
    "48": "/images/icon-48.png",
    "128": "/images/icon-128.png"
  } : {
    "16": "/images/icon-16-gray.png",
    "48": "/images/icon-48-gray.png",
    "128": "/images/icon-128-gray.png"
  };
  
  // chrome.action.setIcon({ path }).catch(() => {});
}

// 2. LinkedIn Session Management
async function extractSession() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: 'linkedin.com' });
    
    const liAt = cookies.find(c => c.name === 'li_at');
    const jsessionid = cookies.find(c => c.name === 'JSESSIONID');
    
    if (liAt && jsessionid) {
      session.li_at = liAt.value;
      // JSESSIONID is enclosed in quotes, need to strip them
      session.JSESSIONID = jsessionid.value.replace(/"/g, '');
      console.log('[Automation Bridge] Session extracted successfully');
      sendSessionToBackend();
    } else {
      console.warn('[Automation Bridge] Not logged into LinkedIn');
    }
  } catch (err) {
    console.error('Failed to extract cookies', err);
  }
}

function sendSessionToBackend() {
  if (ws && ws.readyState === WebSocket.OPEN && session.li_at && session.JSESSIONID) {
    ws.send(JSON.stringify({
      type: 'SESSION_SYNC',
      payload: session
    }));
  }
}

// Listen for cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('linkedin.com')) {
    if (changeInfo.cookie.name === 'li_at' || changeInfo.cookie.name === 'JSESSIONID') {
      console.log('LinkedIn auth cookies changed, re-extracting...');
      extractSession();
    }
  }
});

// 3. Command Router (Backend -> Extension)
async function handleCommand(command) {
  console.log('[Automation Bridge] Received command:', command);
  const p = command.payload || {};
  
  if (command.type === 'FIND_LEAD') {
    sendMessageToContentScript(p.url, { 
      action: 'scrapeProfile',
      leadId: p.leadId,
      campaignId: p.campaignId
    });
  } 
  else if (command.type === 'SEND_CONNECTION') {
    sendMessageToContentScript(p.url || p.profileUrl, { 
      action: 'connect', 
      message: p.message || '',
      leadId: p.leadId,
      campaignId: p.campaignId
    });
  }
  else if (command.type === 'SILENT_VERIFY') {
    handleSilentVerify(p.url, p.leadId);
  }
  else if (command.type === 'SEND_MESSAGE') {
    sendMessageToContentScript(p.profileUrl || p.url, {
      action: 'sendMessage',
      message: p.message || '',
      leadId: p.leadId,
      campaignId: p.campaignId
    });
  }
  else if (command.type === 'SYNC_INBOX') {
    handleInboxSync();
  }
}

// 5. Inbox Sync - Scrape LinkedIn messages using Voyager API
async function handleInboxSync() {
  try {
    if (!session.li_at || !session.JSESSIONID) {
      console.warn('[Inbox Sync] No LinkedIn session available');
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'SYNC_ERROR', payload: { error: 'No LinkedIn session. Please log into LinkedIn first.' } }));
      }
      return;
    }

    console.log('[Inbox Sync] Fetching conversations from LinkedIn...');
    const headers = {
      'Accept': 'application/vnd.linkedin.normalized+json+2.1',
      'x-li-lang': 'en_US',
      'x-restli-protocol-version': '2.0.0',
      'csrf-token': session.JSESSIONID,
      'Cookie': `li_at=${session.li_at}; JSESSIONID="${session.JSESSIONID}"`
    };

    // Fetch recent conversations using the working endpoint
    const convRes = await fetch('https://www.linkedin.com/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX', {
      headers
    });

    if (!convRes.ok) {
      // Try alternate endpoint
      console.warn(`[Inbox Sync] Primary endpoint returned ${convRes.status}, trying alternate...`);
      const altRes = await fetch('https://www.linkedin.com/voyager/api/messaging/conversations', {
        headers
      });
      if (!altRes.ok) {
        throw new Error(`Conversations fetch failed: ${altRes.status}`);
      }
      var convData = await altRes.json();
    } else {
      var convData = await convRes.json();
    }

    const messages = [];
    const conversations = convData.elements || [];
    const included = convData.included || [];

    console.log(`[Inbox Sync] Found ${conversations.length} conversations, ${included.length} included entities`);

    for (const conv of conversations.slice(0, 20)) {
      const participants = conv.participants || [];
      const convUrn = conv.entityUrn || conv['*conversation'] || '';
      const convId = convUrn.split(':').pop();
      if (!convId) continue;

      // Extract participant info from included data
      let participantName = '';
      let participantUrl = '';

      for (const p of participants) {
        const memberUrn = typeof p === 'string' ? p :
          p['com.linkedin.voyager.messaging.MessagingMember']?.miniProfile?.entityUrn ||
          p.miniProfile?.entityUrn ||
          p['*miniProfile'] ||
          p.entityUrn || '';
        const profileId = memberUrn.split(':').pop();

        // Search included array for matching profile
        const profile = included.find(i =>
          (i.$type === 'com.linkedin.voyager.identity.shared.MiniProfile' ||
           i.$type === 'com.linkedin.voyager.messaging.MessagingMember' ||
           i.firstName) &&
          (i.publicIdentifier === profileId ||
           i.entityUrn?.includes(profileId) ||
           i['*miniProfile']?.includes(profileId))
        );

        if (profile && profile.firstName) {
          participantName = `${profile.firstName} ${profile.lastName || ''}`;
          participantUrl = `https://www.linkedin.com/in/${profile.publicIdentifier || profileId}`;
          break;
        }
      }

      // If no name found from participants, try to get it from included miniprofiles
      if (!participantName && included.length > 0) {
        const convMember = included.find(i =>
          i.$type?.includes('MessagingMember') &&
          i.entityUrn?.includes(convId)
        );
        if (convMember) {
          const mp = included.find(i =>
            i.$type?.includes('MiniProfile') &&
            convMember['*miniProfile']?.includes(i.entityUrn?.split(':').pop())
          );
          if (mp) {
            participantName = `${mp.firstName} ${mp.lastName || ''}`;
            participantUrl = `https://www.linkedin.com/in/${mp.publicIdentifier}`;
          }
        }
      }

      // Fetch messages for this conversation
      try {
        const msgRes = await fetch(`https://www.linkedin.com/voyager/api/messaging/conversations/${convId}/events?count=10`, {
          headers
        });

        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const events = msgData.elements || [];

          for (const evt of events) {
            const body = evt.eventContent?.['com.linkedin.voyager.messaging.event.MessageEvent'];
            if (!body) continue;

            // Determine direction
            const senderUrn = evt.from?.['com.linkedin.voyager.messaging.MessagingMember']?.miniProfile?.entityUrn ||
              evt.from?.miniProfile?.entityUrn ||
              evt.from?.entityUrn || '';

            // The user's own profile URN is in conv.hostUrn or we can check against "me"
            const myUrn = conv.hostUrn || conv['*hostProfile'] || '';
            const isFromMe = myUrn && senderUrn.includes(myUrn.split(':').pop());

            messages.push({
              participantName: participantName || 'Unknown',
              participantUrl: participantUrl || '',
              content: body.body || body.attributedBody?.text || '',
              direction: isFromMe ? 'outbound' : 'inbound',
              linkedinMessageId: evt.entityUrn || `${convId}_${evt.createdAt}`,
              timestamp: evt.createdAt ? new Date(evt.createdAt).toISOString() : new Date().toISOString()
            });
          }
        } else {
          console.warn(`[Inbox Sync] Messages fetch for conv ${convId}: ${msgRes.status}`);
        }
      } catch (e) {
        console.warn(`[Inbox Sync] Failed to fetch messages for conv ${convId}`, e.message);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[Inbox Sync] Scraped ${messages.length} messages from ${conversations.length} conversations`);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'MESSAGES_DATA',
        payload: { messages }
      }));
    }
  } catch (err) {
    console.error('[Inbox Sync] Error:', err.message);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'SYNC_ERROR', payload: { error: err.message } }));
    }
  }
}

// 4. Silent Verification Using Built-in Fetch
async function handleSilentVerify(profileUrl, leadId) {
  try {
    console.log(`[Automation Bridge] Silently verifying ${profileUrl}`);
    const res = await fetch(profileUrl);
    
    if (!res.ok) {
      if (res.status === 404) throw new Error('Profile not found (404)');
      throw new Error(`Failed to fetch profile: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const profileData = {
      linkedinUrl: res.url, // Resolved URL (in case of ACwAA... redirect)
    };

    // Parse the embedded JSON from the profile page
    const codeBlocks = html.match(/<code style="display: none" id="[^"]+"><!--([\s\S]*?)--><\/code>/g);
    
    if (codeBlocks) {
      for (const block of codeBlocks) {
        try {
          const match = block.match(/<!--([\s\S]*?)-->/);
          if (match && match[1]) {
            const data = JSON.parse(match[1]);
            const included = data.included || [];

            for (const item of included) {
              if (item.$type === 'com.linkedin.voyager.identity.profile.Profile' || 
                 (item.firstName && item.lastName && item.publicIdentifier)) {
                
                if (!profileData.firstName) profileData.firstName = item.firstName;
                if (!profileData.lastName) profileData.lastName = item.lastName;
                if (!profileData.title && item.headline) profileData.title = item.headline;
                if (!profileData.about && item.summary) profileData.about = item.summary.substring(0, 500);
                if (!profileData.isPremium && item.premium !== undefined) profileData.isPremium = item.premium;
                if (!profileData.location && (item.locationName || item.geoLocationName)) {
                  profileData.location = item.locationName || item.geoLocationName;
                }
              }

              if (item.$type === 'com.linkedin.voyager.identity.profile.Position' && !item.timePeriod?.endDate) {
                if (!profileData.company && item.companyName) profileData.company = item.companyName;
                if (!profileData.title && item.title) profileData.title = item.title;
              }

              if ((item.$type === 'com.linkedin.common.VectorImage' || item.artifacts) && item.rootUrl) {
                const largest = item.artifacts?.sort((a,b) => (b.width||0) - (a.width||0))[0];
                if (largest && !profileData.avatar) {
                  profileData.avatar = item.rootUrl + largest.fileIdentifyingUrlPathSegment;
                }
              }
            }
          }
        } catch(e) {}
      }
    }

    // Fallback parsing if embedded JSON fails
    if (!profileData.firstName && !profileData.lastName) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch) {
        const parts = titleMatch[1].split(' | ')[0].split(' - ');
        if (parts[0]) {
          const nameParts = parts[0].trim().split(' ');
          if (nameParts.length > 0) {
            profileData.firstName = nameParts[0];
            profileData.lastName = nameParts.slice(1).join(' ');
            if (parts[1]) profileData.title = parts[1].trim();
          }
        }
      }
    }

    if (!profileData.firstName) {
      throw new Error("Could not parse enough data from LinkedIn HTML response.");
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SILENT_VERIFY_SUCCESS',
        payload: { leadId, profileData }
      }));
    }

  } catch (err) {
    console.error(`[Automation Bridge] Silent Verify Error: ${err.message}`);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SILENT_VERIFY_FAILED',
        payload: { leadId, error: err.message }
      }));
    }
  }
}

async function sendMessageToContentScript(url, msg) {
  // Find or create tab with the URL
  chrome.tabs.query({ url: "*://*.linkedin.com/*" }, (tabs) => {
    let targetTab = tabs.find(t => t.url.includes(url));
    
    if (targetTab) {
      // Focus tab and send message
      chrome.tabs.update(targetTab.id, { active: true });
      chrome.tabs.sendMessage(targetTab.id, msg);
    } else {
      // Open new tab, wait for load, then send
      chrome.tabs.create({ url, active: true }, (newTab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === newTab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            // Give the page a moment to render JS frameworks
            setTimeout(() => {
              chrome.tabs.sendMessage(newTab.id, msg);
            }, 3000);
          }
        });
      });
    }
  });
}

// Initialize session on startup (token loading is handled at line 13)
extractSession();
