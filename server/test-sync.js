/**
 * End-to-end test for the message sync pipeline.
 * Simulates what the extension does: connects via WebSocket, sends MESSAGES_DATA,
 * and then verifies the messages appear in the database via the REST API.
 * 
 * Run: node test-sync.js
 */
const WebSocket = require('ws');
const http = require('http');

const BASE = 'http://127.0.0.1:3001';

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
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function main() {
  console.log('=== AutoReach Message Sync Pipeline Test ===\n');

  // Step 1: Login to get JWT token
  console.log('1. Logging in...');
  const loginRes = await fetchJSON('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@admin.com', password: '123456' }
  });

  if (loginRes.status !== 200) {
    console.error('   ❌ Login failed:', loginRes.data);
    process.exit(1);
  }
  var token = loginRes.data.token;
  console.log('   ✅ Logged in with admin@admin.com');

  // Step 2: Check current inbox state
  console.log('\n2. Checking current inbox...');
  const inboxBefore = await fetchJSON('/api/inbox', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`   📥 Current conversations: ${inboxBefore.data.conversations?.length || 0}`);

  // Step 3: Connect via WebSocket (simulating extension)
  console.log('\n3. Connecting WebSocket (simulating extension)...');
  const ws = new WebSocket(`ws://127.0.0.1:3001?token=${token}`);

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('   ✅ WebSocket connected!');
      resolve();
    });
    ws.on('error', (err) => {
      console.error('   ❌ WebSocket connection failed:', err.message);
      reject(err);
    });
    setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
  });

  // Step 4: Send SESSION_SYNC (simulating LinkedIn cookie extraction)
  console.log('\n4. Sending SESSION_SYNC...');
  ws.send(JSON.stringify({
    type: 'SESSION_SYNC',
    payload: {
      li_at: 'test_li_at_cookie_value',
      JSESSIONID: 'test_jsessionid_value'
    }
  }));
  console.log('   ✅ Session synced');

  // Step 5: Send MESSAGES_DATA (simulating inbox scrape)
  console.log('\n5. Sending MESSAGES_DATA (3 test messages from 2 conversations)...');
  const testMessages = [
    {
      participantName: 'John Test',
      participantUrl: 'https://www.linkedin.com/in/john-test',
      content: 'Hey, I saw your profile and would love to connect!',
      direction: 'inbound',
      linkedinMessageId: `test_msg_${Date.now()}_1`,
      timestamp: new Date(Date.now() - 3600000).toISOString()
    },
    {
      participantName: 'John Test',
      participantUrl: 'https://www.linkedin.com/in/john-test',
      content: 'Thanks for connecting! How can I help?',
      direction: 'outbound',
      linkedinMessageId: `test_msg_${Date.now()}_2`,
      timestamp: new Date(Date.now() - 1800000).toISOString()
    },
    {
      participantName: 'Jane Demo',
      participantUrl: 'https://www.linkedin.com/in/jane-demo',
      content: 'Hi there, interested in your automation tool.',
      direction: 'inbound',
      linkedinMessageId: `test_msg_${Date.now()}_3`,
      timestamp: new Date().toISOString()
    }
  ];

  ws.send(JSON.stringify({
    type: 'MESSAGES_DATA',
    payload: { messages: testMessages }
  }));
  console.log('   ✅ Messages sent via WebSocket');

  // Step 6: Wait for backend to process
  console.log('\n6. Waiting 2s for backend to process...');
  await new Promise(r => setTimeout(r, 2000));

  // Step 7: Verify messages appeared in inbox API
  console.log('\n7. Verifying messages in inbox API...');
  const inboxAfter = await fetchJSON('/api/inbox', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const convs = inboxAfter.data.conversations || [];
  console.log(`   📥 Conversations after sync: ${convs.length}`);

  const johnConv = convs.find(c => c.participantName === 'John Test');
  const janeConv = convs.find(c => c.participantName === 'Jane Demo');

  if (johnConv) {
    console.log(`   ✅ John Test conversation found (unread: ${johnConv.unreadCount})`);

    // Verify messages inside
    const threadRes = await fetchJSON(`/api/inbox/${johnConv.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const msgs = threadRes.data.messages || [];
    console.log(`      └─ Messages in thread: ${msgs.length}`);
    for (const m of msgs) {
      console.log(`         ${m.direction === 'inbound' ? '←' : '→'} "${m.content.substring(0, 50)}..."`);
    }
  } else {
    console.error('   ❌ John Test conversation NOT found');
  }

  if (janeConv) {
    console.log(`   ✅ Jane Demo conversation found (unread: ${janeConv.unreadCount})`);
  } else {
    console.error('   ❌ Jane Demo conversation NOT found');
  }

  // Step 8: Test reply
  if (johnConv) {
    console.log('\n8. Testing reply to John Test...');
    const replyRes = await fetchJSON(`/api/inbox/${johnConv.id}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { content: 'This is an automated test reply!' }
    });
    if (replyRes.status === 201) {
      console.log('   ✅ Reply sent successfully:', replyRes.data.content);
    } else {
      console.error('   ❌ Reply failed:', replyRes.data);
    }
  }

  // Step 9: Test trigger-sync endpoint
  console.log('\n9. Testing trigger-sync endpoint...');
  const triggerRes = await fetchJSON('/api/inbox/trigger-sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`   ${triggerRes.status === 200 ? '✅' : '⚠️'} trigger-sync: ${JSON.stringify(triggerRes.data)}`);

  // Listen for any response from backend
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    console.log(`   📨 Received from backend: ${msg.type}`);
  });

  await new Promise(r => setTimeout(r, 1000));

  // Cleanup
  ws.close();
  console.log('\n=== Test Complete ===');
  process.exit(0);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
