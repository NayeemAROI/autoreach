async function main() {
  const li_at = 'AQEFARABAAAAAByTdqUAAAGc9MRK1QAAAZ0jNfd4TQAAs3VybjpsaTplbnRlcnByaXNlQXV0aFRva2VuOmVKeGpaQUFDanNrT0xDQ2FOK3RuSlloV3JMVjBaQVF4S25kSFJvQVpjVFhCL2d5TUFKVHBCMFk9XnVybjpsaTplbnRlcnByaXNlUHJvZmlsZToodXJuOmxpOmVudGVycHJpc2VBY2NvdW50OjE0Mzg2NzkwOCwyMjUxMTQ0ODkpXnVybjpsaTptZW1iZXI6NzM2Nzg5MzA3zhtNv3cvvYTClwynIPSYl2F2O54s_fdWMkNwBnYTgMHzAclodTYbdOzsYMsypJwbM91InOF48MEVWMah7J2G5owj9yc1454L4qEbcTD2U1666xSe0-XmAzPQ1EUo87eehPBhPT5ENanVeKTPe7A5-INVgwGV9Yek4yVXkLsdtIkcJWP9Y_fRfLhSh4nEtQ4n75ZxWA';
  const csrf = 'ajax:8201964353249076767';
  const memberId = 'ACoAACvqgzsBHm-QeZ3qvRqPuJSCG2pAOAQJGUs';
  
  const headers = {
    'Accept': 'application/vnd.linkedin.normalized+json+2.1',
    'x-li-lang': 'en_US',
    'x-restli-protocol-version': '2.0.0',
    'x-li-track': JSON.stringify({ clientVersion: '1.13.42903', osName: 'web', deviceFormFactor: 'DESKTOP', mpName: 'voyager-web' }),
    'csrf-token': csrf,
    'Cookie': 'li_at=' + li_at + '; JSESSIONID="' + csrf + '"',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.linkedin.com/messaging/',
  };

  // Get first conversation
  const convUrl = 'https://www.linkedin.com/voyager/api/voyagerMessagingDashMessengerConversations?q=syncToken&mailboxUrn=' + encodeURIComponent('urn:li:fsd_profile:' + memberId) + '&count=1';
  const convRes = await fetch(convUrl, { headers });
  const convData = await convRes.json();
  const conv = (convData.included || []).find(i => i.$type === 'com.linkedin.messenger.Conversation');
  if (!conv) { console.log('No conv found'); return; }
  
  const threadId = (conv.backendUrn || '').replace('urn:li:messagingThread:', '');
  console.log('ThreadId:', threadId);
  
  // Get events
  const evUrl = 'https://www.linkedin.com/voyager/api/messaging/conversations/' + encodeURIComponent(threadId) + '/events?count=3';
  const evRes = await fetch(evUrl, { headers });
  const evData = await evRes.json();
  
  const events = (evData.included || []).filter(i => i.$type === 'com.linkedin.voyager.messaging.Event');
  console.log('Found', events.length, 'events\n');
  
  for (const ev of events.slice(0, 3)) {
    console.log('=== EVENT ===');
    console.log('Keys:', Object.keys(ev).join(', '));
    console.log('from:', JSON.stringify(ev.from, null, 2));
    console.log('*from:', ev['*from']);
    console.log('body:', (ev.eventContent?.attributedBody?.text || ev.eventContent?.body || '').substring(0, 50));
    console.log('');
  }
  
  // Also dump full first event
  console.log('=== FULL FIRST EVENT ===');
  console.log(JSON.stringify(events[0], null, 2));
}

main().catch(console.error);
