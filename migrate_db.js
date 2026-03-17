const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'server', 'db', 'automation.db');
const db = new Database(dbPath);

console.log('Checking schema for table: campaigns');
const info = db.prepare("PRAGMA table_info('campaigns')").all();
const columns = info.map(c => c.name);
console.log('Current columns:', columns);

const requiredColumns = [
  { name: 'status', type: "TEXT DEFAULT 'draft'" },
  { name: 'type', type: "TEXT DEFAULT 'linkedin'" },
  { name: 'sequence', type: "TEXT DEFAULT '[]'" },
  { name: 'leadIds', type: "TEXT DEFAULT '[]'" },
  { name: 'stats', type: "TEXT DEFAULT '{\"sent\":0,\"accepted\":0,\"replied\":0,\"bounced\"0}'" },
  { name: 'schedule', type: "TEXT DEFAULT '{\"startTime\":\"09:00\",\"endTime\":\"18:00\",\"days\":[\"mon\",\"tue\",\"wed\",\"thu\",\"fri\"],\"timezone\":\"UTC+6\"}'" }
];

for (const col of requiredColumns) {
  if (!columns.includes(col.name)) {
    console.log(`Adding missing column: ${col.name}`);
    try {
      db.prepare(`ALTER TABLE campaigns ADD COLUMN ${col.name} ${col.type}`).run();
    } catch (e) {
      console.error(`Failed to add column ${col.name}:`, e.message);
    }
  }
}

console.log('Migration complete.');
db.close();
