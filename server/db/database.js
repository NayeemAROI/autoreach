const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Use persistent disk on Render (/var/data), fallback to local for development
const PERSIST_DIR = '/var/data';
const usePersistedPath = process.env.NODE_ENV === 'production' && fs.existsSync(PERSIST_DIR);
const dbPath = usePersistedPath
  ? path.join(PERSIST_DIR, 'automation.db')
  : path.join(__dirname, 'automation.db');

console.log(`💾 Database path: ${dbPath} (persistent: ${usePersistedPath})`);
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

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    maxAttempts INTEGER DEFAULT 3,
    lastError TEXT,
    runAt TEXT DEFAULT (datetime('now')),
    lockedAt TEXT,
    completedAt TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    user_id TEXT,
    campaign_id TEXT,
    lead_id TEXT
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

// Add LinkedIn cookie columns for server-side API access (Phantombuster-style)
const usersColumns5 = db.prepare("PRAGMA table_info(users)").all();
if (!usersColumns5.some((col) => col.name === "linkedin_cookie")) {
  console.log("Migration: Adding linkedin_cookie to users");
  try {
    db.prepare("ALTER TABLE users ADD COLUMN linkedin_cookie TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE users ADD COLUMN linkedin_csrf TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE users ADD COLUMN linkedin_cookie_valid INTEGER DEFAULT 0").run();
    db.prepare("ALTER TABLE users ADD COLUMN linkedin_profile_name TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE users ADD COLUMN linkedin_profile_url TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE users ADD COLUMN linkedin_connected_at TEXT DEFAULT ''").run();
  } catch(e) {
    console.warn("LinkedIn cookie migration warning:", e.message);
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

// Audit log table for comprehensive activity tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT DEFAULT '',
    action TEXT NOT NULL,
    entity_type TEXT DEFAULT '',
    entity_id TEXT DEFAULT '',
    entity_name TEXT DEFAULT '',
    details TEXT DEFAULT '{}',
    ip_address TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_log(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
  CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);
`);

// Events table for conversion tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    lead_id TEXT DEFAULT '',
    campaign_id TEXT DEFAULT '',
    type TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  CREATE INDEX IF NOT EXISTS idx_events_campaign ON events(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_events_date ON events(created_at);
`);

// Campaign execution logs table
db.exec(`
  CREATE TABLE IF NOT EXISTS campaign_logs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    lead_id TEXT DEFAULT '',
    step_id TEXT DEFAULT '',
    action_type TEXT NOT NULL,
    result TEXT DEFAULT 'pending',
    error_message TEXT DEFAULT '',
    retry_count INTEGER DEFAULT 0,
    workspace_id TEXT DEFAULT '',
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign ON campaign_logs(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_campaign_logs_lead ON campaign_logs(lead_id);
  CREATE INDEX IF NOT EXISTS idx_campaign_logs_date ON campaign_logs(created_at);
`);

// Create jobs queue table
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    maxAttempts INTEGER DEFAULT 3,
    lastError TEXT DEFAULT '',
    runAt TEXT DEFAULT (datetime('now')),
    lockedAt TEXT DEFAULT NULL,
    completedAt TEXT DEFAULT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    user_id TEXT,
    campaign_id TEXT,
    lead_id TEXT
  );
`);

// Create lead_notes table
db.exec(`
  CREATE TABLE IF NOT EXISTS lead_notes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Create inbox tables
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    lead_id TEXT,
    participantName TEXT DEFAULT '',
    participantUrl TEXT DEFAULT '',
    linkedinThreadId TEXT DEFAULT '',
    lastMessage TEXT DEFAULT '',
    lastMessageAt TEXT DEFAULT (datetime('now')),
    unreadCount INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    direction TEXT DEFAULT 'inbound',
    content TEXT NOT NULL DEFAULT '',
    senderName TEXT DEFAULT '',
    linkedinMessageId TEXT DEFAULT '',
    isRead INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ====== Multi-workspace LinkedIn support ======

// Add LinkedIn columns to workspaces table
const wsColumns = db.prepare("PRAGMA table_info(workspaces)").all();
if (!wsColumns.some(col => col.name === 'linkedin_cookie')) {
  console.log('Migration: Adding LinkedIn columns to workspaces');
  try {
    db.prepare("ALTER TABLE workspaces ADD COLUMN linkedin_cookie TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE workspaces ADD COLUMN linkedin_csrf TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE workspaces ADD COLUMN linkedin_cookie_valid INTEGER DEFAULT 0").run();
    db.prepare("ALTER TABLE workspaces ADD COLUMN linkedin_profile_name TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE workspaces ADD COLUMN linkedin_profile_url TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE workspaces ADD COLUMN linkedin_member_id TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE workspaces ADD COLUMN linkedin_connected_at TEXT DEFAULT ''").run();
    // Copy LinkedIn data from users to their default workspace
    db.prepare(`
      UPDATE workspaces SET 
        linkedin_cookie = (SELECT linkedin_cookie FROM users WHERE users.id = workspaces.owner_id),
        linkedin_csrf = (SELECT linkedin_csrf FROM users WHERE users.id = workspaces.owner_id),
        linkedin_cookie_valid = (SELECT linkedin_cookie_valid FROM users WHERE users.id = workspaces.owner_id),
        linkedin_profile_name = (SELECT linkedin_profile_name FROM users WHERE users.id = workspaces.owner_id),
        linkedin_profile_url = (SELECT linkedin_profile_url FROM users WHERE users.id = workspaces.owner_id),
        linkedin_connected_at = (SELECT linkedin_connected_at FROM users WHERE users.id = workspaces.owner_id)
    `).run();
    console.log('Migration: Copied LinkedIn data from users to workspaces');
  } catch(e) {
    console.warn('Workspace LinkedIn migration warning:', e.message);
  }
}

// Add workspace_id to data tables
const leadsColumns = db.prepare("PRAGMA table_info(leads)").all();
if (!leadsColumns.some(col => col.name === 'workspace_id')) {
  console.log('Migration: Adding workspace_id to data tables');
  try {
    db.prepare("ALTER TABLE leads ADD COLUMN workspace_id TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE campaigns ADD COLUMN workspace_id TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE activities ADD COLUMN workspace_id TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE events ADD COLUMN workspace_id TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE conversations ADD COLUMN workspace_id TEXT DEFAULT ''").run();
    // Populate workspace_id from user's active workspace
    db.prepare(`UPDATE leads SET workspace_id = (SELECT activeWorkspaceId FROM users WHERE users.id = leads.user_id) WHERE workspace_id = ''`).run();
    db.prepare(`UPDATE campaigns SET workspace_id = (SELECT activeWorkspaceId FROM users WHERE users.id = campaigns.user_id) WHERE workspace_id = ''`).run();
    db.prepare(`UPDATE activities SET workspace_id = (SELECT activeWorkspaceId FROM users WHERE users.id = activities.user_id) WHERE workspace_id = ''`).run();
    db.prepare(`UPDATE events SET workspace_id = (SELECT activeWorkspaceId FROM users WHERE users.id = events.user_id) WHERE workspace_id = ''`).run();
    db.prepare(`UPDATE conversations SET workspace_id = (SELECT activeWorkspaceId FROM users WHERE users.id = conversations.user_id) WHERE workspace_id = ''`).run();
    // Create indexes
    db.prepare('CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id)').run();
    console.log('Migration: workspace_id added and populated on all data tables');
  } catch(e) {
    console.warn('workspace_id migration warning:', e.message);
  }
}

// === Profile & Workspace Management Migrations ===

// Add profile columns to users
const usersProfileCols = db.prepare("PRAGMA table_info(users)").all();
if (!usersProfileCols.some(col => col.name === 'phone')) {
  console.log('Migration: Adding profile columns to users');
  try {
    db.prepare("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE users ADD COLUMN title TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'UTC+6'").run();
    db.prepare("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''").run();
    db.prepare("ALTER TABLE users ADD COLUMN last_login_at TEXT DEFAULT ''").run();
  } catch(e) {
    console.warn('User profile migration warning:', e.message);
  }
}

// Create user_preferences table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email_notifications INTEGER DEFAULT 1,
    campaign_notifications INTEGER DEFAULT 1,
    inbox_notifications INTEGER DEFAULT 1,
    weekly_summary INTEGER DEFAULT 1,
    theme TEXT DEFAULT 'dark',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Create workspace_invites table
db.exec(`
  CREATE TABLE IF NOT EXISTS workspace_invites (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    token TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending',
    invited_by TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_invites_token ON workspace_invites(token);
  CREATE INDEX IF NOT EXISTS idx_invites_email ON workspace_invites(email);
  CREATE INDEX IF NOT EXISTS idx_invites_workspace ON workspace_invites(workspace_id);
`);

// Add status + invited_at to workspace_members
const wmCols = db.prepare("PRAGMA table_info(workspace_members)").all();
if (!wmCols.some(col => col.name === 'status')) {
  console.log('Migration: Adding status/invited_at to workspace_members');
  try {
    db.prepare("ALTER TABLE workspace_members ADD COLUMN status TEXT DEFAULT 'active'").run();
    db.prepare("ALTER TABLE workspace_members ADD COLUMN invited_at TEXT DEFAULT ''").run();
  } catch(e) {
    console.warn('workspace_members migration warning:', e.message);
  }
}

// Migration: Ensure only the user's active workspace keeps LinkedIn data
// (the earlier migration incorrectly copied LinkedIn to ALL workspaces)
try {
  const allUsers = db.prepare('SELECT id, activeWorkspaceId FROM users WHERE activeWorkspaceId IS NOT NULL AND activeWorkspaceId != \'\'').all();
  for (const u of allUsers) {
    const cleared = db.prepare(`
      UPDATE workspaces SET 
        linkedin_cookie = '', linkedin_csrf = '', linkedin_cookie_valid = 0,
        linkedin_profile_name = '', linkedin_profile_url = '', linkedin_member_id = '',
        linkedin_connected_at = ''
      WHERE owner_id = ? AND id != ? AND linkedin_cookie != ''
    `).run(u.id, u.activeWorkspaceId);
    if (cleared.changes > 0) {
      console.log(`Migration: Cleared LinkedIn from ${cleared.changes} non-default workspace(s) for user ${u.id}`);
    }
  }
} catch(e) {
  console.warn('LinkedIn isolation migration warning:', e.message);
}

// End of Create inbox tables

// No seed data in production — users register through the app
console.log('✅ Database initialized (clean, no seed data)');

module.exports = db;
