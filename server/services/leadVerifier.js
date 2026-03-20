/**
 * Server-side Lead Verifier
 * Uses LinkedIn Voyager API with stored cookies — no extension needed
 */

const db = require('../db/database');
const fetch = require('node-fetch');
const linkedinApi = require('./linkedinApi');

class LeadVerifier {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.minDelayMs = 5000;
    this.maxDelayMs = 15000;
  }

  initialize() {
    console.log('🔍 Lead Verifier initialized (server-side mode)');
  }

  enqueueLeads(leadIds, userId, campaignId, options = {}) {
    const batch = leadIds.slice(0, 10);
    
    for (const leadId of batch) {
      const lead = db.prepare('SELECT id, linkedinUrl, verification_status FROM leads WHERE id = ? AND user_id = ?').get(leadId, userId);
      if (!lead) continue;
      if (lead.verification_status === 'verified' && !options.force) continue;

      const alreadyQueued = this.queue.some(q => q.leadId === leadId);
      if (alreadyQueued) continue;

      this.queue.push({ leadId: lead.id, userId, linkedinUrl: lead.linkedinUrl });
      db.prepare('UPDATE leads SET verification_status = ? WHERE id = ?').run('pending', lead.id);
    }

    console.log(`🔍 Enqueued ${batch.length} leads for verification. Queue size: ${this.queue.length}`);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async verifyViaAPI(linkedinUrl, userId, leadId) {
    const cookie = linkedinApi.getCookie(userId);
    if (!cookie || !cookie.valid) {
      throw new Error('No valid LinkedIn cookie. Please add your li_at cookie in Settings.');
    }

    const publicId = linkedinUrl.replace(/.*linkedin\.com\/in\//i, '').replace(/[/?#].*/, '');
    if (!publicId) throw new Error('Invalid LinkedIn URL');

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/vnd.linkedin.normalized+json+2.1',
      'x-li-lang': 'en_US',
      'x-restli-protocol-version': '2.0.0',
      'csrf-token': cookie.csrf,
      'Cookie': `li_at=${cookie.li_at}; JSESSIONID="${cookie.csrf}"`,
    };

    const url = `https://www.linkedin.com/voyager/api/identity/profiles/${encodeURIComponent(publicId)}/profileView`;
    const response = await fetch(url, { headers });

    if (response.status === 401 || response.status === 403) {
      throw new Error('LinkedIn session expired.');
    }
    if (!response.ok) throw new Error(`Profile fetch failed: ${response.status}`);

    const data = await response.json();
    const included = data.included || [];
    
    const result = { firstName: '', lastName: '', title: '', company: '', location: '', about: '', avatar: '', connectionDegree: '', isPremium: false };

    const profile = included.find(item =>
      item.$type === 'com.linkedin.voyager.identity.profile.Profile' ||
      (item.publicIdentifier && item.publicIdentifier === publicId)
    );

    if (profile) {
      result.firstName = profile.firstName || '';
      result.lastName = profile.lastName || '';
      result.title = profile.headline || '';
      result.location = profile.locationName || profile.geoLocationName || '';
      result.about = (profile.summary || '').substring(0, 500);
      result.isPremium = !!profile.premium;
    }

    const miniProfile = included.find(item =>
      item.$type === 'com.linkedin.voyager.identity.shared.MiniProfile' &&
      item.publicIdentifier === publicId
    );
    if (miniProfile) {
      if (!result.firstName) result.firstName = miniProfile.firstName || '';
      if (!result.lastName) result.lastName = miniProfile.lastName || '';
      if (!result.title) result.title = miniProfile.occupation || '';
    }

    const positions = included.filter(item =>
      item.$type === 'com.linkedin.voyager.identity.profile.Position'
    );
    const currentPosition = positions.find(pos => !pos.timePeriod?.endDate);
    if (currentPosition) result.company = currentPosition.companyName || '';
    else if (positions.length > 0) result.company = positions[0].companyName || '';

    return result;
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      console.log('🔍 Verification queue empty');
      return;
    }

    this.isProcessing = true;
    const item = this.queue[0];

    db.prepare('UPDATE leads SET verification_status = ? WHERE id = ?').run('verifying', item.leadId);
    console.log(`🔍 Verifying lead ${item.leadId} at ${item.linkedinUrl} via server-side API...`);

    try {
      const profileData = await this.verifyViaAPI(item.linkedinUrl, item.userId, item.leadId);

      if (!profileData || (!profileData.firstName && !profileData.lastName)) {
        db.prepare('UPDATE leads SET verification_status = ? WHERE id = ?').run('failed', item.leadId);
        this.queue.shift();
        this.scheduleNext();
        return;
      }

      const updates = {};
      if (profileData.firstName) updates.firstName = profileData.firstName;
      if (profileData.lastName) updates.lastName = profileData.lastName;
      if (profileData.title) updates.title = profileData.title;
      if (profileData.company) updates.company = profileData.company;
      if (profileData.location) updates.location = profileData.location;
      if (profileData.about) updates.about = profileData.about;
      if (profileData.avatar) updates.avatar = profileData.avatar;
      if (profileData.isPremium !== undefined) updates.isPremium = profileData.isPremium ? 1 : 0;

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

    const delayMs = Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs) + this.minDelayMs);
    console.log(`🔍 Next verification in ${Math.round(delayMs / 1000)}s (${this.queue.length} remaining)`);
    setTimeout(() => this.processQueue(), delayMs);
  }

  getStatus() {
    return { queueLength: this.queue.length, isProcessing: this.isProcessing };
  }
}

const verifier = new LeadVerifier();
module.exports = verifier;
