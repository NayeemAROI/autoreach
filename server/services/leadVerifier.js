const db = require('../db/database');
const bridge = require('./linkedinBridge');

class LeadVerifier {
  constructor() {
    this.queue = []; // { leadId, userId, linkedinUrl }
    this.isProcessing = false;
    this.minDelayMs = 5000;  // 5 seconds between profile fetches
    this.maxDelayMs = 15000; // 15 seconds max
  }

  initialize() {
    console.log('🔍 Lead Verifier initialized (hybrid browser-scraping mode)');
  }

  // Enqueue leads for verification
  enqueueLeads(leadIds, userId, campaignId, options = {}) {
    const batch = leadIds.slice(0, 10);
    
    for (const leadId of batch) {
      const lead = db.prepare('SELECT id, linkedinUrl, verification_status FROM leads WHERE id = ? AND user_id = ?').get(leadId, userId);
      if (!lead) continue;
      
      // If already verified and not forcing, skip
      if (lead.verification_status === 'verified' && !options.force) continue;

      // Don't add duplicates
      const alreadyQueued = this.queue.some(q => q.leadId === leadId);
      if (alreadyQueued) continue;

      this.queue.push({
        leadId: lead.id,
        userId,
        linkedinUrl: lead.linkedinUrl,
      });

      // Mark as pending
      db.prepare('UPDATE leads SET verification_status = ? WHERE id = ?').run('pending', lead.id);
    }

    console.log(`🔍 Enqueued ${batch.length} leads for verification. Queue size: ${this.queue.length}`);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async scrapeProfileViaBridge(linkedinUrl, userId, leadId) {
    return new Promise((resolve, reject) => {
      const timeoutName = setTimeout(() => {
        cleanup();
        reject(new Error('Extension took too long to verify (timeout after 30s)'));
      }, 30000);

      const onSuccess = (data) => {
        if (data.leadId === leadId) {
          cleanup();
          resolve(data.profileData);
        }
      };

      const onFailed = (data) => {
        if (data.leadId === leadId) {
          cleanup();
          reject(new Error(data.error || 'Silent verification failed'));
        }
      };

      const cleanup = () => {
        clearTimeout(timeoutName);
        bridge.removeListener('silent_verify_success', onSuccess);
        bridge.removeListener('silent_verify_failed', onFailed);
      };

      bridge.on('silent_verify_success', onSuccess);
      bridge.on('silent_verify_failed', onFailed);

      const sent = bridge.silentVerify(userId, linkedinUrl, leadId);
      if (!sent) {
        cleanup();
        reject(new Error('Extension is not connected. Cannot silently verify. Please connect the extension.'));
      }
    });
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      console.log('🔍 Verification queue empty');
      return;
    }

    this.isProcessing = true;
    const item = this.queue[0];

    // Mark as verifying
    db.prepare('UPDATE leads SET verification_status = ? WHERE id = ?').run('verifying', item.leadId);

    console.log(`🔍 Verifying lead ${item.leadId} at ${item.linkedinUrl} via extension...`);

    try {
      // Send WebSocket message and wait for Promise to resolve with profileData
      const profileData = await this.scrapeProfileViaBridge(item.linkedinUrl, item.userId, item.leadId);

      if (!profileData || (!profileData.firstName && !profileData.lastName)) {
        console.log(`🔍 No useful profile data returned for lead ${item.leadId}`);
        db.prepare('UPDATE leads SET verification_status = ? WHERE id = ?').run('failed', item.leadId);
        this.queue.shift();
        this.scheduleNext();
        return;
      }

      // Update lead with scraped data
      const updates = {};
      if (profileData.firstName) updates.firstName = profileData.firstName;
      if (profileData.lastName) updates.lastName = profileData.lastName;
      if (profileData.title) updates.title = profileData.title;
      if (profileData.company) updates.company = profileData.company;
      if (profileData.location) updates.location = profileData.location;
      if (profileData.about) updates.about = profileData.about;
      if (profileData.avatar) updates.avatar = profileData.avatar;
      if (profileData.connectionDegree) updates.connectionDegree = profileData.connectionDegree;
      if (profileData.linkedinUrl) updates.linkedinUrl = profileData.linkedinUrl;
      if (profileData.isPremium !== undefined) updates.isPremium = profileData.isPremium ? 1 : 0;
      if (profileData.email) updates.email = profileData.email;
      if (profileData.phone) updates.phone = profileData.phone;

      updates.verification_status = 'verified';
      updates.verified_at = new Date().toISOString();

      const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
      const values = Object.values(updates);

      db.prepare(`UPDATE leads SET ${setClauses}, updatedAt = datetime('now') WHERE id = ?`).run(...values, item.leadId);

      console.log(`✅ Lead ${item.leadId} verified: ${profileData.firstName} ${profileData.lastName} @ ${profileData.company}`);
    } catch (err) {
      console.error(`❌ Failed to verify lead ${item.leadId}:`, err.message);
      db.prepare('UPDATE leads SET verification_status = ? WHERE id = ?').run('failed', item.leadId);
    }

    this.queue.shift();
    this.scheduleNext();
  }

  scheduleNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      console.log('🔍 Verification queue empty');
      return;
    }

    // Random human-like delay between fetches
    const delayMs = Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs) + this.minDelayMs);
    console.log(`🔍 Next verification in ${Math.round(delayMs / 1000)}s (${this.queue.length} remaining)`);
    
    setTimeout(() => {
      this.processQueue();
    }, delayMs);
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }
}

// Singleton
const verifier = new LeadVerifier();
module.exports = verifier;
