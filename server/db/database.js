const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'automation.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_verified INTEGER DEFAULT 0,
    has_completed_onboarding INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    title TEXT DEFAULT '',
    company TEXT DEFAULT '',
    linkedinUrl TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    status TEXT DEFAULT 'new',
    score INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    source TEXT DEFAULT 'manual',
    avatar TEXT DEFAULT '',
    location TEXT DEFAULT '',
    about TEXT DEFAULT '',
    connectionDegree TEXT DEFAULT '',
    verification_status TEXT DEFAULT 'unverified',
    verified_at TEXT,
    isPremium INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    type TEXT DEFAULT 'linkedin',
    sequence TEXT DEFAULT '[]',
    leadIds TEXT DEFAULT '[]',
    stats TEXT DEFAULT '{"sent":0,"accepted":0,"replied":0,"bounced":0}',
    schedule TEXT DEFAULT '{"startTime":"09:00","endTime":"18:00","days":["mon","tue","wed","thu","fri"],"timezone":"UTC+6"}',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS campaign_leads (
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    current_step_index INTEGER DEFAULT 0,
    current_node_id TEXT,
    next_execution_at TEXT,
    status TEXT DEFAULT 'active',
    error_message TEXT,
    PRIMARY KEY (campaign_id, lead_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    leadId TEXT,
    campaignId TEXT,
    type TEXT NOT NULL,
    detail TEXT DEFAULT '',
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// === MIGRATIONS ===
// Check if has_completed_onboarding exists in users
const usersColumns = db.prepare("PRAGMA table_info(users)").all();
if (!usersColumns.some((col) => col.name === "has_completed_onboarding")) {
  console.log("Migration: Adding has_completed_onboarding to users table");
  try {
    db.prepare("ALTER TABLE users ADD COLUMN has_completed_onboarding INTEGER DEFAULT 0").run();
  } catch(e) {
    console.warn("Migration warning:", e.message);
  }
}

// Add role column to users (admin / user)
const usersColumns2 = db.prepare("PRAGMA table_info(users)").all();
if (!usersColumns2.some((col) => col.name === "role")) {
  console.log("Migration: Adding role column to users table");
  try {
    db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").run();
    // Make the first user an admin
    const firstUser = db.prepare('SELECT id FROM users ORDER BY createdAt ASC LIMIT 1').get();
    if (firstUser) {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(firstUser.id);
      console.log('Migration: First user promoted to admin');
    }
  } catch(e) {
    console.warn("Migration warning:", e.message);
  }
}

// Add plan + Stripe columns to users
const usersColumns3 = db.prepare("PRAGMA table_info(users)").all();
if (!usersColumns3.some((col) => col.name === "plan")) {
  console.log("Migration: Adding plan and stripeCustomerId to users");
  try {
    db.prepare("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'").run();
    db.prepare("ALTER TABLE users ADD COLUMN stripeCustomerId TEXT DEFAULT ''").run();
  } catch(e) {
    console.warn("Migration warning:", e.message);
  }
}

// Create subscriptions table
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stripeSubscriptionId TEXT DEFAULT '',
    stripePriceId TEXT DEFAULT '',
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    currentPeriodStart TEXT DEFAULT '',
    currentPeriodEnd TEXT DEFAULT '',
    cancelAtPeriodEnd INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expiresAt TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    joinedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(workspace_id, user_id)
  );
`);

// Add activeWorkspaceId to users
const usersColumns4 = db.prepare("PRAGMA table_info(users)").all();
if (!usersColumns4.some((col) => col.name === "activeWorkspaceId")) {
  console.log("Migration: Adding activeWorkspaceId to users");
  try {
    db.prepare("ALTER TABLE users ADD COLUMN activeWorkspaceId TEXT DEFAULT ''").run();
  } catch(e) {
    console.warn("Migration warning:", e.message);
  }
}

// Migrate role values: 'admin' -> 'owner' for first user, keep rest
const usersWithAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
if (usersWithAdmin.length > 0) {
  db.prepare("UPDATE users SET role = 'owner' WHERE role = 'admin'").run();
  console.log(`Migration: Upgraded ${usersWithAdmin.length} admin(s) to owner role`);
}

// Auto-create default workspace for users who don't have one
const usersWithoutWorkspace = db.prepare("SELECT id, name, email FROM users WHERE activeWorkspaceId = '' OR activeWorkspaceId IS NULL").all();
for (const u of usersWithoutWorkspace) {
  const wsId = uuidv4();
  const slug = u.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-workspace';
  try {
    db.prepare("INSERT OR IGNORE INTO workspaces (id, name, slug, owner_id) VALUES (?, ?, ?, ?)").run(wsId, `${u.name}'s Workspace`, slug, u.id);
    db.prepare("INSERT OR IGNORE INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, 'owner')").run(uuidv4(), wsId, u.id);
    db.prepare("UPDATE users SET activeWorkspaceId = ? WHERE id = ?").run(wsId, u.id);
    console.log(`Migration: Created workspace for user ${u.email}`);
  } catch(e) {
    console.warn("Workspace migration warning:", e.message);
  }
}

// Create Default UI User if no users exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
let defaultUserId = '';

if (userCount.count === 0) {
  defaultUserId = uuidv4();
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.prepare('INSERT INTO users (id, name, email, password, is_verified) VALUES (?, ?, ?, ?, 1)').run(
    defaultUserId,
    'System Admin',
    'admin@example.com',
    hashedPassword
  );
  console.log(`👤 Created default user: admin@example.com / admin123`);

  // Seed default settings for the default user
  const defaultSettings = [
    ['dailyConnectionLimit', '25'],
    ['dailyMessageLimit', '50'],
    ['dailyEmailLimit', '100'],
    ['workingHoursStart', '09:00'],
    ['workingHoursEnd', '18:00'],
    ['timezone', 'UTC+6'],
    ['warmupMode', 'false'],
    ['warmupDays', '14'],
    ['minDelay', '30'],
    ['maxDelay', '120'],
    ['blacklist', '[]'],
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, user_id, value) VALUES (?, ?, ?)');
  for (const [key, value] of defaultSettings) {
    insertSetting.run(`${key}_${defaultUserId}`, defaultUserId, value);
  }
} else {
  // Grab the first user id to assign stuff to just in case
  defaultUserId = db.prepare('SELECT id FROM users LIMIT 1').get().id;
}


// Seed sample data for demo (Only if leads are empty)
const existingLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get();
if (existingLeads.count === 0) {
  console.log('🌱 Database leads empty. Seeding UI test data...');
  const sampleLeads = [
    { firstName: 'Sarah', lastName: 'Chen', title: 'VP of Engineering', company: 'TechFlow AI', status: 'connected', score: 85, tags: '["Hot Lead","Decision Maker"]', source: 'sales_navigator' },
    { firstName: 'Marcus', lastName: 'Johnson', title: 'CTO', company: 'DataPulse Inc', status: 'replied', score: 92, tags: '["Hot Lead","CTO"]', source: 'sales_navigator' },
    { firstName: 'Elena', lastName: 'Rodriguez', title: 'Head of Sales', company: 'GrowthStack', status: 'connected', score: 78, tags: '["Decision Maker"]', source: 'csv_import' },
    { firstName: 'James', lastName: 'Kim', title: 'Founder & CEO', company: 'NeuralPath', status: 'pending', score: 65, tags: '["Founder"]', source: 'manual' },
    { firstName: 'Priya', lastName: 'Sharma', title: 'Director of Marketing', company: 'CloudScale', status: 'new', score: 50, tags: '["Marketing"]', source: 'sales_navigator' },
    { firstName: 'Alex', lastName: 'Thompson', title: 'Sales Director', company: 'Quantum Labs', status: 'replied', score: 88, tags: '["Hot Lead","Sales"]', source: 'csv_import' },
    { firstName: 'Lisa', lastName: 'Wang', title: 'Product Manager', company: 'InnovateTech', status: 'connected', score: 72, tags: '["Product"]', source: 'sales_navigator' },
    { firstName: 'David', lastName: 'Okafor', title: 'COO', company: 'SwiftDeploy', status: 'new', score: 45, tags: '["C-Suite"]', source: 'manual' },
    { firstName: 'Rachel', lastName: 'Bennett', title: 'VP of Business Dev', company: 'SynergyAI', status: 'pending', score: 60, tags: '["Decision Maker"]', source: 'sales_navigator' },
    { firstName: 'Omar', lastName: 'Hassan', title: 'Engineering Manager', company: 'CipherSec', status: 'connected', score: 70, tags: '["Engineering"]', source: 'csv_import' },
    { firstName: 'Sophie', lastName: 'Martin', title: 'CEO', company: 'BrightEdge Digital', status: 'replied', score: 95, tags: '["Hot Lead","CEO","Decision Maker"]', source: 'sales_navigator' },
    { firstName: 'Ryan', lastName: 'Patel', title: 'Head of Growth', company: 'Velocity.io', status: 'connected', score: 80, tags: '["Growth","Decision Maker"]', source: 'csv_import' },
  ];

  const insertLead = db.prepare(`
    INSERT INTO leads (id, user_id, firstName, lastName, title, company, linkedinUrl, email, status, score, tags, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const lead of sampleLeads) {
    insertLead.run(
      uuidv4(),
      defaultUserId,
      lead.firstName,
      lead.lastName,
      lead.title,
      lead.company,
      `https://linkedin.com/in/${lead.firstName.toLowerCase()}-${lead.lastName.toLowerCase()}`,
      `${lead.firstName.toLowerCase()}.${lead.lastName.toLowerCase()}@${lead.company.toLowerCase().replace(/\s+/g, '')}.com`,
      lead.status,
      lead.score,
      lead.tags,
      lead.source
    );
  }

  // Seed sample campaigns
  const sampleCampaigns = [
    {
      name: 'SaaS Founders Q1 Outreach',
      status: 'active',
      type: 'multi-channel',
      sequence: JSON.stringify([
        { step: 1, type: 'connect', message: 'Hi {{firstName}}, loved your work at {{company}}. Would love to connect!', delay: 0 },
        { step: 2, type: 'wait', days: 2 },
        { step: 3, type: 'message', message: 'Thanks for connecting {{firstName}}! I noticed {{company}} is doing great things in the AI space...', delay: 0 },
        { step: 4, type: 'wait', days: 3 },
        { step: 5, type: 'email', message: 'Hi {{firstName}}, following up on my LinkedIn message...', delay: 0 },
      ]),
      stats: JSON.stringify({ sent: 145, accepted: 58, replied: 22, bounced: 3 }),
    },
    {
      name: 'Tech CTOs - Product Demo',
      status: 'active',
      type: 'linkedin',
      sequence: JSON.stringify([
        { step: 1, type: 'visit', delay: 0 },
        { step: 2, type: 'wait', days: 1 },
        { step: 3, type: 'connect', message: 'Hi {{firstName}}, your experience at {{company}} is impressive!', delay: 0 },
        { step: 4, type: 'wait', days: 3 },
        { step: 5, type: 'message', message: 'Would love to show you a quick demo...', delay: 0 },
      ]),
      stats: JSON.stringify({ sent: 89, accepted: 34, replied: 12, bounced: 0 }),
    },
    {
      name: 'Marketing Leaders - Email Sequence',
      status: 'paused',
      type: 'email',
      sequence: JSON.stringify([
        { step: 1, type: 'email', message: 'Subject: Quick question about {{company}}...', delay: 0 },
        { step: 2, type: 'wait', days: 3 },
        { step: 3, type: 'email', message: 'Subject: Following up - {{firstName}}', delay: 0 },
      ]),
      stats: JSON.stringify({ sent: 200, accepted: 0, replied: 35, bounced: 12 }),
    },
    {
      name: 'Enterprise Accounts - ABM',
      status: 'draft',
      type: 'multi-channel',
      sequence: JSON.stringify([]),
      stats: JSON.stringify({ sent: 0, accepted: 0, replied: 0, bounced: 0 }),
    },
  ];

  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (id, user_id, name, status, type, sequence, stats)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of sampleCampaigns) {
    insertCampaign.run(uuidv4(), defaultUserId, c.name, c.status, c.type, c.sequence, c.stats);
  }

  // Seed sample activities
  const activityTypes = [
    { type: 'connection_sent', detail: 'Connection request sent to' },
    { type: 'connection_accepted', detail: 'Connection accepted by' },
    { type: 'message_sent', detail: 'Message sent to' },
    { type: 'message_replied', detail: 'Reply received from' },
    { type: 'email_sent', detail: 'Email sent to' },
    { type: 'email_opened', detail: 'Email opened by' },
    { type: 'profile_visited', detail: 'Profile visited:' },
  ];

  const insertActivity = db.prepare(`
    INSERT INTO activities (id, user_id, leadId, type, detail, timestamp)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const leadRecords = db.prepare('SELECT id, firstName, lastName FROM leads WHERE user_id = ?').all(defaultUserId);
  for (let i = 0; i < 30; i++) {
    if(leadRecords.length === 0) break;
    const lead = leadRecords[Math.floor(Math.random() * leadRecords.length)];
    const activity = activityTypes[Math.floor(Math.random() * activityTypes.length)];
    const hoursAgo = `-${Math.floor(Math.random() * 72)} hours`;
    insertActivity.run(
      uuidv4(),
      defaultUserId,
      lead.id,
      activity.type,
      `${activity.detail} ${lead.firstName} ${lead.lastName}`,
      hoursAgo
    );
  }
}

module.exports = db;
