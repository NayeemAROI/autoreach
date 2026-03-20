// SQLite-based job queue (BullMQ pattern without Redis dependency)
const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class JobQueue {
  constructor() {
    this.handlers = {};
    this.pollIntervalMs = 5000; // 5 seconds
    this.pollTimer = null;
    this.isProcessing = false;
    this.concurrency = 1;
  }

  // Register a handler for a job type
  register(type, handler) {
    this.handlers[type] = handler;
  }

  // Add a job to the queue
  add(type, payload, options = {}) {
    const id = uuidv4();
    const {
      priority = 0,
      maxAttempts = 3,
      delay = 0, // ms
      userId = null,
      campaignId = null,
      leadId = null,
    } = options;

    // Use SQLite-compatible datetime format (space instead of T, no Z)
    const toSqlite = (d) => d.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
    const runAt = delay > 0
      ? toSqlite(new Date(Date.now() + delay))
      : toSqlite(new Date());

    db.prepare(`
      INSERT INTO jobs (id, type, payload, priority, maxAttempts, runAt, user_id, campaign_id, lead_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type, JSON.stringify(payload), priority, maxAttempts, runAt, userId, campaignId, leadId);

    return id;
  }

  // Add a job with randomized delay
  addWithJitter(type, payload, baseDelayMs, jitterMs, options = {}) {
    const jitter = Math.floor(Math.random() * jitterMs * 2) - jitterMs; // +/- jitterMs
    const delay = Math.max(0, baseDelayMs + jitter);
    return this.add(type, payload, { ...options, delay });
  }

  // Start polling for jobs
  start() {
    if (this.pollTimer) return;
    logger.info('📋 Job Queue started (poll: 5s)');
    this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.pollIntervalMs);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info('📋 Job Queue stopped');
  }

  async poll() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Fetch pending jobs that are due, ordered by priority + creation
      const jobs = db.prepare(`
        SELECT * FROM jobs
        WHERE status = 'pending'
          AND runAt <= datetime('now')
          AND (lockedAt IS NULL OR lockedAt < datetime('now', '-5 minutes'))
        ORDER BY priority DESC, createdAt ASC
        LIMIT ?
      `).all(this.concurrency);

      if (jobs.length > 0) {
        logger.info(`📋 Job Queue: Processing ${jobs.length} pending job(s)`);
      }

      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (err) {
      logger.error('Job queue poll error', { error: err.message });
    }

    this.isProcessing = false;
  }

  async processJob(job) {
    const handler = this.handlers[job.type];
    if (!handler) {
      logger.warn(`No handler for job type: ${job.type}`);
      db.prepare("UPDATE jobs SET status = 'failed', lastError = 'No handler registered' WHERE id = ?").run(job.id);
      return;
    }

    // Lock the job
    db.prepare("UPDATE jobs SET lockedAt = datetime('now'), attempts = attempts + 1 WHERE id = ?").run(job.id);

    let payload;
    try { payload = JSON.parse(job.payload); } catch { payload = {}; }

    try {
      await handler(payload, job);

      // Success
      db.prepare("UPDATE jobs SET status = 'completed', completedAt = datetime('now'), lockedAt = NULL WHERE id = ?").run(job.id);
    } catch (err) {
      const attempts = job.attempts + 1;
      logger.error(`Job ${job.id} failed (attempt ${attempts}/${job.maxAttempts})`, { error: err.message, type: job.type });

      if (attempts >= job.maxAttempts) {
        // Dead letter — mark as failed
        db.prepare("UPDATE jobs SET status = 'failed', lastError = ?, lockedAt = NULL WHERE id = ?").run(err.message, job.id);
        logger.warn(`Job ${job.id} moved to dead letter (max retries exceeded)`);
      } else {
        // Retry with exponential backoff: 30s, 2min, 8min...
        const backoffMs = Math.pow(4, attempts) * 30000;
        const retryAt = new Date(Date.now() + backoffMs).toISOString();
        db.prepare("UPDATE jobs SET status = 'pending', lastError = ?, lockedAt = NULL, runAt = ? WHERE id = ?").run(err.message, retryAt, job.id);
        logger.info(`Job ${job.id} scheduled for retry at ${retryAt}`);
      }
    }
  }

  // Get queue stats
  stats() {
    const pending = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'pending'").get().c;
    const processing = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE lockedAt IS NOT NULL AND status = 'pending'").get().c;
    const completed = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'completed'").get().c;
    const failed = db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'failed'").get().c;
    return { pending, processing, completed, failed };
  }

  // Clean old completed jobs (>7 days)
  cleanup() {
    const deleted = db.prepare("DELETE FROM jobs WHERE status IN ('completed','failed') AND completedAt < datetime('now', '-7 days')").run();
    if (deleted.changes > 0) logger.info(`Cleaned ${deleted.changes} old jobs`);
  }
}

module.exports = new JobQueue();
