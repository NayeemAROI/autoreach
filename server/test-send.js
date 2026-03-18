/**
 * Send test messages to a specific LinkedIn profile via the sync pipeline.
 * This simulates messages being scraped from LinkedIn inbox.
 * 
 * Run: node test-send.js
 */
const WebSocket = require('ws');
const http = require('http');

const BASE = 'http://127.0.0.1:3001';
const TARGET_PROFILE = 'https://www.linkedin.com/in/helloaarif';
const TARGET_NAME = 'Arif';

async function fetchJSON(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function main() {
  console.log('=== Send Test Messages to helloaarif ===\n');

  // Login
  const loginRes = await fetchJSON('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@admin.com', password: '123456' }
  });
  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.data);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('✅ Logged in');

  // Connect WebSocket
  const ws = new WebSocket(`ws://127.0.0.1:3001?token=${token}`);
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('timeout')), 5000);
  });
  console.log('✅ WebSocket connected');

  // Send session
  ws.send(JSON.stringify({
    type: 'SESSION_SYNC',
    payload: { li_at: 'test', JSESSIONID: 'test' }
  }));

  // Simulate a real conversation with helloaarif
  const now = Date.now();
  const testMessages = [
    {
      participantName: TARGET_NAME,
      participantUrl: TARGET_PROFILE,
      content: 'Hi Arif! I came across your profile and was really impressed by your work in automation. Would love to connect!',
      direction: 'outbound',
      linkedinMessageId: `arif_msg_${now}_1`,
      timestamp: new Date(now - 7200000).toISOString() // 2 hours ago
    },
    {
      participantName: TARGET_NAME,
      participantUrl: TARGET_PROFILE,
      content: 'Hey! Thanks for reaching out. Always happy to connect with fellow automation enthusiasts. What are you working on?',
      direction: 'inbound',
      linkedinMessageId: `arif_msg_${now}_2`,
      timestamp: new Date(now - 3600000).toISOString() // 1 hour ago
    },
    {
      participantName: TARGET_NAME,
      participantUrl: TARGET_PROFILE,
      content: 'I\'m building an outreach automation tool called AutoReach. It syncs LinkedIn messages directly into a CRM-like dashboard. Would love your feedback!',
      direction: 'outbound',
      linkedinMessageId: `arif_msg_${now}_3`,
      timestamp: new Date(now - 1800000).toISOString() // 30 min ago
    },
    {
      participantName: TARGET_NAME,
      participantUrl: TARGET_PROFILE,
      content: 'That sounds amazing! I\'d love to check it out. Can you share a demo link?',
      direction: 'inbound',
      linkedinMessageId: `arif_msg_${now}_4`,
      timestamp: new Date(now - 300000).toISOString() // 5 min ago
    }
  ];

  ws.send(JSON.stringify({
    type: 'MESSAGES_DATA',
    payload: { messages: testMessages }
  }));
  console.log(`✅ Sent ${testMessages.length} messages for ${TARGET_NAME}`);

  // Wait for processing
  await new Promise(r => setTimeout(r, 2000));

  // Verify
  const inboxRes = await fetchJSON('/api/inbox', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const convs = inboxRes.data.conversations || [];
  const arifConv = convs.find(c => c.participantUrl?.includes('helloaarif'));
  
  if (arifConv) {
    console.log(`✅ Conversation with ${TARGET_NAME} created!`);
    console.log(`   Unread: ${arifConv.unreadCount}`);
    console.log(`   Last message: "${arifConv.lastMessage}"`);
    
    // Get full thread
    const threadRes = await fetchJSON(`/api/inbox/${arifConv.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const msgs = threadRes.data.messages || [];
    console.log(`   Messages in thread: ${msgs.length}`);
    for (const m of msgs) {
      console.log(`   ${m.direction === 'inbound' ? '←' : '→'} "${m.content.substring(0, 60)}..."`);
    }
  } else {
    console.error('❌ Conversation not found');
  }

  ws.close();
  console.log('\n=== Done ===');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
