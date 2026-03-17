const db = require('../db/database');
const { getClients } = require('./linkedinBridge');

class CampaignEngine {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkIntervalMs = 60 * 1000; 
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('⚙️ Campaign Execution Engine disabled temporarily to avoid spam...');
  }


  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⚙️ Campaign Execution Engine stopped.');
  }

  async processCampaigns() {
    try {
      const now = new Date().toISOString();
      const query = `
        SELECT cl.*, c.sequence, c.status as campaign_status
        FROM campaign_leads cl
        JOIN campaigns c ON cl.campaign_id = c.id
        WHERE cl.status = 'active'
          AND c.status = 'active'
          AND (cl.next_execution_at IS NULL OR cl.next_execution_at <= ?)
      `;
      const pendingLeads = db.prepare(query).all(now);

      if (pendingLeads.length > 0) {
        console.log(`⚙️ Engine found ${pendingLeads.length} leads due for processing.`);
      }

      for (const leadState of pendingLeads) {
        await this.processLead(leadState);
      }
    } catch (err) {
      console.error('⚙️ Engine processing error:', err);
    }
  }

  async processLead(leadState) {
    let sequence;
    try {
      sequence = JSON.parse(leadState.sequence || '[]');
    } catch {
      sequence = [];
    }

    // Detect tree vs flat array
    const isTree = sequence && typeof sequence === 'object' && sequence.rootId && sequence.nodes;

    if (isTree) {
      await this.processLeadTree(leadState, sequence);
    } else if (Array.isArray(sequence)) {
      await this.processLeadLinear(leadState, sequence);
    } else {
      this.markLeadCompleted(leadState);
    }
  }

  // ─── Tree-based Processing ───
  async processLeadTree(leadState, tree) {
    let nodeId = leadState.current_node_id;

    // If no current node, start from root's first child
    if (!nodeId) {
      const rootNode = tree.nodes[tree.rootId];
      nodeId = rootNode?.yesChild;
      if (!nodeId) {
        this.markLeadCompleted(leadState);
        return;
      }
      // Save the starting node
      db.prepare('UPDATE campaign_leads SET current_node_id = ? WHERE campaign_id = ? AND lead_id = ?')
        .run(nodeId, leadState.campaign_id, leadState.lead_id);
    }

    const currentNode = tree.nodes[nodeId];
    if (!currentNode) {
      this.markLeadCompleted(leadState);
      return;
    }

    // Terminal node
    if (currentNode.type === 'end') {
      this.markLeadCompleted(leadState);
      return;
    }

    // Execute Action
    let success = false;
    if (currentNode.type === 'delay') {
      success = this.handleDelay(leadState, currentNode.config);
    } else if (['view_profile', 'send_invite', 'like_post', 'endorse', 'comment', 'send_message', 'withdraw_invite'].includes(currentNode.type)) {
      success = await this.handleLinkedinAction(leadState, currentNode);
    } else {
      console.warn(`⚙️ Unknown node type: ${currentNode.type}`);
      success = true;
    }

    if (success) {
      this.advanceLeadTree(leadState, tree, currentNode);
    }
  }

  advanceLeadTree(leadState, tree, currentNode) {
    let nextExecution = new Date();
    let nextNodeId = null;

    if (currentNode.type === 'delay') {
      const days = parseInt(currentNode.config?.days || 1, 10);
      nextExecution.setDate(nextExecution.getDate() + days);
      nextNodeId = currentNode.yesChild; // Delay always goes to yesChild
    } else {
      // Default 5 minute spacing between actions
      nextExecution.setMinutes(nextExecution.getMinutes() + 5);

      // For branching nodes, we default to yesChild for now 
      // (real condition evaluation would need extension feedback)
      // TODO: Implement real condition checking when extension reports back
      nextNodeId = currentNode.yesChild;
    }

    if (!nextNodeId || !tree.nodes[nextNodeId]) {
      this.markLeadCompleted(leadState);
      return;
    }

    db.prepare(`
      UPDATE campaign_leads 
      SET current_node_id = ?, next_execution_at = ?
      WHERE campaign_id = ? AND lead_id = ?
    `).run(nextNodeId, nextExecution.toISOString(), leadState.campaign_id, leadState.lead_id);
  }

  // ─── Legacy Linear Processing ───
  async processLeadLinear(leadState, sequence) {
    const currentStepIndex = leadState.current_step_index;

    if (currentStepIndex >= sequence.length) {
      this.markLeadCompleted(leadState);
      return;
    }

    const currentStep = sequence[currentStepIndex];

    let success = false;
    if (currentStep.type === 'delay') {
      success = this.handleDelay(leadState, currentStep);
    } else if (currentStep.type === 'linkedin_view' || currentStep.type === 'linkedin_connect' || currentStep.type === 'linkedin_message') {
      success = await this.handleLinkedinAction(leadState, currentStep);
    } else if (currentStep.type === 'email') {
      success = await this.handleEmailAction(leadState, currentStep);
    } else {
      success = true;
    }

    if (success) {
      this.advanceLeadLinear(leadState, sequence);
    }
  }

  advanceLeadLinear(leadState, sequence) {
    const currentStep = sequence[leadState.current_step_index];
    let nextExecution = new Date();

    if (currentStep.type === 'delay') {
      const days = parseInt(currentStep.days || 0, 10);
      nextExecution.setDate(nextExecution.getDate() + days);
    } else {
      nextExecution.setMinutes(nextExecution.getMinutes() + 5);
    }

    const nextIndex = leadState.current_step_index + 1;
    
    db.prepare(`
      UPDATE campaign_leads 
      SET current_step_index = ?, next_execution_at = ?
      WHERE campaign_id = ? AND lead_id = ?
    `).run(nextIndex, nextExecution.toISOString(), leadState.campaign_id, leadState.lead_id);
  }

  // ─── Shared Action Handlers ───

  handleDelay(leadState, config) {
    console.log(`⚙️ Executing delay step for lead ${leadState.lead_id} (${config?.days || 1} days)`);
    return true; 
  }

  async handleLinkedinAction(leadState, stepOrNode) {
    const actionType = stepOrNode.type?.replace('linkedin_', '') || stepOrNode.type;
    console.log(`⚙️ Executing LinkedIn action '${actionType}' for lead ${leadState.lead_id}`);
    
    const clients = getClients(leadState.user_id);
    if (!clients || clients.length === 0) {
      console.log(`⚙️ User ${leadState.user_id} has no active extensions connected. Skipping for now.`);
      return false;
    }

    const lead = db.prepare('SELECT linkedinUrl FROM leads WHERE id = ?').get(leadState.lead_id);
    if (!lead || !lead.linkedinUrl) {
      this.markLeadError(leadState, 'Missing LinkedIn URL');
      return false;
    }

    const ws = clients[0];
    ws.send(JSON.stringify({
      type: 'DISPATCH_ACTION',
      payload: {
        action: actionType,
        profileUrl: lead.linkedinUrl,
        message: stepOrNode.config?.message || stepOrNode.message || '',
        withNote: stepOrNode.config?.withNote || false,
        note: stepOrNode.config?.note || ''
      }
    }));

    db.prepare('INSERT INTO activities (id, user_id, leadId, campaignId, type, detail) VALUES (?, ?, ?, ?, ?, ?)')
      .run(require('uuid').v4(), leadState.user_id, leadState.lead_id, leadState.campaign_id, actionType, `Dispatched ${actionType} to extension`);

    return true;
  }

  async handleEmailAction(leadState, stepConfig) {
    console.log(`⚙️ Executing Email action for lead ${leadState.lead_id}`);
    return true;
  }

  markLeadCompleted(leadState) {
    db.prepare(`
      UPDATE campaign_leads 
      SET status = 'completed', next_execution_at = NULL
      WHERE campaign_id = ? AND lead_id = ?
    `).run(leadState.campaign_id, leadState.lead_id);
    console.log(`⚙️ Lead ${leadState.lead_id} completed campaign ${leadState.campaign_id}`);
  }

  markLeadError(leadState, errorMsg) {
    db.prepare(`
      UPDATE campaign_leads 
      SET status = 'error', error_message = ?, next_execution_at = NULL
      WHERE campaign_id = ? AND lead_id = ?
    `).run(errorMsg, leadState.campaign_id, leadState.lead_id);
    console.error(`⚙️ Lead ${leadState.lead_id} had error: ${errorMsg}`);
  }
}

// Singleton Instance
const engine = new CampaignEngine();
module.exports = engine;
