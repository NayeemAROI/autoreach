const db = require('./db/database');
const r1 = db.prepare("DELETE FROM messages WHERE linkedinMessageId != ''").run();
const r2 = db.prepare("DELETE FROM conversations WHERE participantUrl LIKE 'linkedin:%' OR linkedinThreadId != ''").run();
console.log('Deleted', r1.changes, 'messages and', r2.changes, 'conversations');
