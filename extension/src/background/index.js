let ws = null;
let reconnectTimer = null;
let keepaliveInterval = null;
let authToken = null;
const WS_BASE_URL = 'ws://localhost:3001';

// LinkedIn Session State
const session = {
  li_at: null,
  JSESSIONID: null
};

// Listen for token updates from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATUS') {
    sendResponse({
      wsStatus: ws ? (ws.readyState === WebSocket.OPEN ? 'connected' : (ws.readyState === WebSocket.CONNECTING ? 'connecting' : 'disconnected')) : 'disconnected'
    });
    return true;
  }
  else if (request.type === 'TOKEN_UPDATED') {
    chrome.storage.local.get(['outreach_token'], (res) => {
      authToken = res.outreach_token;
      console.log('[Automation Bridge] Token updated, reconnecting...');
      if (ws) {
        ws.close(); // will trigger reconnect with new token
      } else {
        connect();
      }
    });
  } else if (request.type === 'ACTION_COMPLETED' || request.type === 'ACTION_FAILED' || request.type === 'PROFILE_DATA') {
    // Forward from Content Script to backend
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(request));
    }
  }
});

// 1. WebSocket Connection Management
function connect() {
  if (!authToken) {
    console.log('[Automation Bridge] Waiting for API Key to be set in Popup...');
    return;
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  console.log('[Automation Bridge] Connecting to local server...');
  ws = new WebSocket(`${WS_BASE_URL}?token=${authToken}`);

  ws.onopen = () => {
    console.log('[Automation Bridge] Connected to backend');
    clearTimeout(reconnectTimer);
    clearInterval(keepaliveInterval);
    keepaliveInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 20000); // 20s keepalive Ping
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

  ws.onclose = () => {
    console.log('[Automation Bridge] Disconnected from backend');
    clearInterval(keepaliveInterval);
    updateIcon(false);
    reconnectTimer = setTimeout(connect, 3000); // Reconnect every 3s
  };

  ws.onerror = (err) => {
    console.error('[Automation Bridge] WebSocket error');
    clearInterval(keepaliveInterval);
    ws.close();
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
  
  if (command.type === 'FIND_LEAD') {
    // Tell content script to scrape a profile
    sendMessageToContentScript(command.payload.url, { action: 'scrapeProfile' });
  } 
  else if (command.type === 'SEND_CONNECTION') {
    // Send connection via content script
    sendMessageToContentScript(command.payload.url, { 
      action: 'connect', 
      message: command.payload.message 
    });
  }
  else if (command.type === 'SILENT_VERIFY') {
    handleSilentVerify(command.payload.url, command.payload.leadId);
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

// Initialize
chrome.storage.local.get(['outreach_token'], (res) => {
  if (res.outreach_token) {
    authToken = res.outreach_token;
    console.log('[Automation Bridge] Token loaded from storage');
    connect();
  } else {
    console.log('[Automation Bridge] No API Key set. Please click the extension icon.');
  }
});
extractSession();
