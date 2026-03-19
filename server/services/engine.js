const db = require('../db/database');
const bridge = require('./linkedinBridge');
const jobQueue = require('./jobQueue');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// ─── Action Completion Tracking ───
// Listen for extension reporting action results
bridge.on('action_completed', ({ action, userId, leadId, campaignId }) => {
  logger.info(`✅ Extension confirmed action: ${action}`, { leadId, campaignId });
  if (leadId && campaignId) {
    db.prepare('INSERT INTO activities (id, user_id, leadId, campaignId, type, detail) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), userId, leadId, campaignId, `${action}_completed`, `Extension confirmed ${action} success`);
  }
});

bridge.on('action_failed', ({ action, userId, leadId, campaignId, error }) => {
  logger.error(`❌ Extension action failed: ${action}`, { leadId, campaignId, error });
  if (leadId && campaignId) {
    db.prepare('INSERT INTO activities (id, user_id, leadId, campaignId, type, detail) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), userId, leadId, campaignId, `${action}_failed`, `Extension error: ${error || 'unknown'}`);
    markLeadError({ campaign_id: campaignId, lead_id: leadId }, `Action ${action} failed: ${error || 'unknown'}`);
  }
});

// ─── Randomized delay helper ───
function randomDelay(minMs, maxMs) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function getRandomActionDelay() {
  // 2-8 minutes between actions (randomized)
  return randomDelay(2 * 60 * 1000, 8 * 60 * 1000);
}

// ─── Job Handlers ───

// Process a single lead through its campaign sequence
jobQueue.register('process_lead', async (payload, job) => {
  const { campaignId, leadId, userId } = payload;

  const leadState = db.prepare(`
    SELECT cl.*, c.sequence, c.status as campaign_status, c.schedule
    FROM campaign_leads cl
    JOIN campaigns c ON cl.campaign_id = c.id
    WHERE cl.campaign_id = ? AND cl.lead_id = ?
  `).get(campaignId, leadId);

  if (!leadState || leadState.status !== 'active' || leadState.campaign_status !== 'active') {
    return; // Skip — not active
  }

  // Schedule check
  if (!isWithinSchedule(leadState.schedule)) {
    // Re-queue for 30 mins later
    jobQueue.add('process_lead', payload, { delay: 30 * 60 * 1000, userId, campaignId, leadId });
    return;
  }

  let sequence;
  try { sequence = JSON.parse(leadState.sequence || '[]'); } catch { sequence = []; }

  const isTree = sequence && typeof sequence === 'object' && sequence.rootId && sequence.nodes;

  if (isTree) {
    await processLeadTree(leadState, sequence, payload);
  } else if (Array.isArray(sequence)) {
    await processLeadLinear(leadState, sequence, payload);
  } else {
    markLeadCompleted(leadState);
  }
});

// Execute a LinkedIn action
jobQueue.register('linkedin_action', async (payload) => {
  const { userId, leadId, campaignId, actionType, config } = payload;

  const bridge = require('./linkedinBridge');
  if (!bridge.isConnected(userId)) {
    throw new Error('No active extension connected'); // Will trigger retry
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
  if (!lead?.linkedinUrl) {
    markLeadError({ campaign_id: campaignId, lead_id: leadId }, 'Missing LinkedIn URL');
    return;
  }

  // Variable substitution for personalized messages/notes
  function personalize(text) {
    if (!text) return '';
    return text
      .replace(/\{firstName\}/gi, lead.firstName || '')
      .replace(/\{lastName\}/gi, lead.lastName || '')
      .replace(/\{company\}/gi, lead.company || '')
      .replace(/\{title\}/gi, lead.title || '')
      .replace(/\{fullName\}/gi, `${lead.firstName || ''} ${lead.lastName || ''}`.trim());
  }

  // Map engine action types to extension command types
  const ACTION_MAP = {
    'send_invite':     'SEND_CONNECTION',
    'view_profile':    'FIND_LEAD',
    'send_message':    'SEND_MESSAGE',
    'like_post':       'LIKE_POST',
    'endorse':         'ENDORSE',
    'comment':         'COMMENT',
    'withdraw_invite': 'WITHDRAW_INVITE',
    // Linear sequence aliases
    'connect':         'SEND_CONNECTION',
    'message':         'SEND_MESSAGE',
    'view':            'FIND_LEAD'
  };

  const commandType = ACTION_MAP[actionType] || actionType.toUpperCase();
  const message = personalize(config?.message || config?.note || '');

  const sent = bridge.sendCommand(userId, commandType, {
    url: lead.linkedinUrl,
    profileUrl: lead.linkedinUrl,
    message,
    leadId,
    campaignId
  });

  if (!sent) {
    throw new Error('Failed to send command to extension');
  }

  db.prepare('INSERT INTO activities (id, user_id, leadId, campaignId, type, detail) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), userId, leadId, campaignId, actionType, `Dispatched ${commandType} to extension`);

  logger.info(`⚡ Action dispatched: ${actionType} → ${commandType}`, { leadId, campaignId });
});

// ─── Tree-based Processing ───
async function processLeadTree(leadState, tree, jobPayload) {
  let nodeId = leadState.current_node_id;

  if (!nodeId) {
    const rootNode = tree.nodes[tree.rootId];
    nodeId = rootNode?.yesChild;
    if (!nodeId) { markLeadCompleted(leadState); return; }
    db.prepare('UPDATE campaign_leads SET current_node_id = ? WHERE campaign_id = ? AND lead_id = ?')
      .run(nodeId, leadState.campaign_id, leadState.lead_id);
  }

  const currentNode = tree.nodes[nodeId];
  if (!currentNode || currentNode.type === 'end') {
    markLeadCompleted(leadState);
    return;
  }

  // Execute action
  if (currentNode.type === 'delay') {
    // Delay node — advance with randomized jitter
    const days = parseInt(currentNode.config?.days || 1, 10);
    const baseDelayMs = days * 24 * 60 * 60 * 1000;
    const jitter = randomDelay(-2 * 60 * 60 * 1000, 2 * 60 * 60 * 1000); // +/- 2 hours
    advanceLeadTree(leadState, tree, currentNode, Math.max(baseDelayMs + jitter, 60000), jobPayload);
  } else if (['view_profile', 'send_invite', 'like_post', 'endorse', 'comment', 'send_message', 'withdraw_invite'].includes(currentNode.type)) {
    // Queue the LinkedIn action
    jobQueue.addWithJitter('linkedin_action', {
      userId: leadState.user_id,
      leadId: leadState.lead_id,
      campaignId: leadState.campaign_id,
      actionType: currentNode.type,
      config: currentNode.config
    }, 0, 30000, { // 0-30s random start delay
      userId: leadState.user_id,
      campaignId: leadState.campaign_id,
      leadId: leadState.lead_id,
      maxAttempts: 3
    });
    // Advance with randomized delay
    advanceLeadTree(leadState, tree, currentNode, getRandomActionDelay(), jobPayload);
  } else {
    advanceLeadTree(leadState, tree, currentNode, getRandomActionDelay(), jobPayload);
  }
}

function advanceLeadTree(leadState, tree, currentNode, delayMs, jobPayload) {
  const nextNodeId = currentNode.yesChild; // Default YES path

  if (!nextNodeId || !tree.nodes[nextNodeId]) {
    markLeadCompleted(leadState);
    return;
  }

  const nextExecution = new Date(Date.now() + delayMs).toISOString();
  db.prepare('UPDATE campaign_leads SET current_node_id = ?, next_execution_at = ? WHERE campaign_id = ? AND lead_id = ?')
    .run(nextNodeId, nextExecution, leadState.campaign_id, leadState.lead_id);

  // Queue next step
  jobQueue.add('process_lead', jobPayload, {
    delay: delayMs,
    userId: leadState.user_id,
    campaignId: leadState.campaign_id,
    leadId: leadState.lead_id
  });
}

// ─── Linear Processing ───
async function processLeadLinear(leadState, sequence, jobPayload) {
  const idx = leadState.current_step_index;
  if (idx >= sequence.length) { markLeadCompleted(leadState); return; }

  const step = sequence[idx];
  let delayMs = getRandomActionDelay();

  if (step.type === 'delay') {
    const days = parseInt(step.days || 1, 10);
    delayMs = days * 24 * 60 * 60 * 1000 + randomDelay(-60 * 60 * 1000, 60 * 60 * 1000);
  } else if (['linkedin_view', 'linkedin_connect', 'linkedin_message'].includes(step.type)) {
    jobQueue.addWithJitter('linkedin_action', {
      userId: leadState.user_id,
      leadId: leadState.lead_id,
      campaignId: leadState.campaign_id,
      actionType: step.type.replace('linkedin_', ''),
      config: step
    }, 0, 30000, { userId: leadState.user_id, maxAttempts: 3 });
  }

  const nextIndex = idx + 1;
  const nextExecution = new Date(Date.now() + delayMs).toISOString();
  db.prepare('UPDATE campaign_leads SET current_step_index = ?, next_execution_at = ? WHERE campaign_id = ? AND lead_id = ?')
    .run(nextIndex, nextExecution, leadState.campaign_id, leadState.lead_id);

  if (nextIndex < sequence.length) {
    jobQueue.add('process_lead', jobPayload, {
      delay: delayMs,
      userId: leadState.user_id,
      campaignId: leadState.campaign_id,
      leadId: leadState.lead_id
    });
  }
}

// ─── Helpers ───
function markLeadCompleted(leadState) {
  db.prepare("UPDATE campaign_leads SET status = 'completed', next_execution_at = NULL WHERE campaign_id = ? AND lead_id = ?")
    .run(leadState.campaign_id, leadState.lead_id);
  logger.info(`✅ Lead ${leadState.lead_id} completed campaign ${leadState.campaign_id}`);
}

function markLeadError(leadState, errorMsg) {
  db.prepare("UPDATE campaign_leads SET status = 'error', error_message = ?, next_execution_at = NULL WHERE campaign_id = ? AND lead_id = ?")
    .run(errorMsg, leadState.campaign_id, leadState.lead_id);
  logger.error(`❌ Lead ${leadState.lead_id} error: ${errorMsg}`);
}

function isWithinSchedule(scheduleJson) {
  if (!scheduleJson) return true;
  try {
    const schedule = JSON.parse(scheduleJson);
    if (!schedule.days || !schedule.startTime || !schedule.endTime) return true;

    const now = new Date();
    let offsetHours = 0, offsetMinutes = 0;

    if (schedule.timezone?.startsWith('UTC')) {
      const match = schedule.timezone.match(/UTC([+-])(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        offsetHours = parseInt(match[2], 10) * sign;
        if (match[3]) offsetMinutes = parseInt(match[3], 10) * sign;
      }
    }

    const localNow = new Date(now.getTime() + (offsetHours * 3600000) + (offsetMinutes * 60000));
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = dayNames[localNow.getUTCDay()];
    if (!schedule.days.includes(currentDay)) return false;

    const h = localNow.getUTCHours(), m = localNow.getUTCMinutes();
    const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return t >= schedule.startTime && t <= schedule.endTime;
  } catch { return true; }
}

// ─── Campaign Scanner ───
// Scans for active leads that need processing and enqueues them
class CampaignEngine {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkIntervalMs = 60 * 1000;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('⚙️ Campaign Engine started (interval: 60s)');

    // Start the job queue
    jobQueue.start();

    // Scan immediately, then on interval
    this.scanAndEnqueue().catch(err => logger.error('Initial scan error', { error: err.message }));
    this.intervalId = setInterval(() => {
      this.scanAndEnqueue().catch(err => logger.error('Scan error', { error: err.message }));
    }, this.checkIntervalMs);

    // Clean old jobs every hour
    setInterval(() => jobQueue.cleanup(), 60 * 60 * 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    jobQueue.stop();
    logger.info('⚙️ Campaign Engine stopped');
  }

  async scanAndEnqueue() {
    const now = new Date().toISOString();
    const pendingLeads = db.prepare(`
      SELECT cl.campaign_id, cl.lead_id, cl.user_id
      FROM campaign_leads cl
      JOIN campaigns c ON cl.campaign_id = c.id
      WHERE cl.status = 'active'
        AND c.status = 'active'
        AND (cl.next_execution_at IS NULL OR cl.next_execution_at <= ?)
    `).all(now);

    if (pendingLeads.length === 0) return;
    logger.info(`⚙️ Scanner found ${pendingLeads.length} leads due for processing`);

    for (const lead of pendingLeads) {
      // Check if job already exists for this lead
      const existing = db.prepare("SELECT id FROM jobs WHERE lead_id = ? AND campaign_id = ? AND status = 'pending'").get(lead.lead_id, lead.campaign_id);
      if (existing) continue;

      jobQueue.addWithJitter('process_lead', {
        campaignId: lead.campaign_id,
        leadId: lead.lead_id,
        userId: lead.user_id
      }, 0, 15000, { // 0-15s random start spread
        userId: lead.user_id,
        campaignId: lead.campaign_id,
        leadId: lead.lead_id
      });
    }
  }
}

const engine = new CampaignEngine();
module.exports = engine;
