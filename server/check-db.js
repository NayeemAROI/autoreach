const db = require('./db/database');
const msgs = db.prepare("SELECT direction, senderName, content FROM messages LIMIT 10").all();
msgs.forEach(m => console.log(m.direction, '|', m.senderName, '|', (m.content || '').substring(0,60)));
console.log('\nTotal outbound:', db.prepare("SELECT COUNT(*) as c FROM messages WHERE direction='outbound'").get().c);
console.log('Total inbound:', db.prepare("SELECT COUNT(*) as c FROM messages WHERE direction='inbound'").get().c);

// Check threadIds
const convs = db.prepare("SELECT participantName, linkedinThreadId FROM conversations WHERE linkedinThreadId != '' LIMIT 5").all();
console.log('\nConversations with threadId:');
convs.forEach(c => console.log(' ', c.participantName, '|', c.linkedinThreadId?.substring(0,30)));
