// Force IPv4 for all connections — must be FIRST before any imports
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Stripe webhook needs raw body — must be before express.json()
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripeConfigured = stripeKey && !stripeKey.includes('REPLACE_ME');

if (stripeConfigured) {
  const stripe = require('stripe')(stripeKey);
  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const db = require('./db/database');
    const { v4: uuidv4 } = require('uuid');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        if (userId && planId) {
          db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(planId, userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customerId = sub.customer;
        const user = db.prepare('SELECT id FROM users WHERE stripeCustomerId = ?').get(customerId);
        if (user) {
          const planId = sub.metadata?.planId || (sub.items?.data?.[0]?.price?.id === process.env.STRIPE_PRICE_BUSINESS ? 'business' : 'pro');
          db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(sub.status === 'active' ? planId : 'free', user.id);

          const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ?').get(user.id);
          if (existing) {
            db.prepare(`UPDATE subscriptions SET stripeSubscriptionId = ?, plan = ?, status = ?, 
              currentPeriodStart = ?, currentPeriodEnd = ?, cancelAtPeriodEnd = ?, updatedAt = datetime('now') 
              WHERE user_id = ?`).run(sub.id, planId, sub.status, new Date(sub.current_period_start * 1000).toISOString(), new Date(sub.current_period_end * 1000).toISOString(), sub.cancel_at_period_end ? 1 : 0, user.id);
          } else {
            db.prepare('INSERT INTO subscriptions (id, user_id, stripeSubscriptionId, plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd) VALUES (?,?,?,?,?,?,?,?)').run(
              uuidv4(), user.id, sub.id, planId, sub.status, new Date(sub.current_period_start * 1000).toISOString(), new Date(sub.current_period_end * 1000).toISOString(), sub.cancel_at_period_end ? 1 : 0);
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const user = db.prepare('SELECT id FROM users WHERE stripeCustomerId = ?').get(sub.customer);
        if (user) {
          db.prepare("UPDATE users SET plan = 'free' WHERE id = ?").run(user.id);
          db.prepare("UPDATE subscriptions SET status = 'canceled', updatedAt = datetime('now') WHERE user_id = ?").run(user.id);
        }
        break;
      }
    }

    res.json({ received: true });
  });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Structured request logging
const logger = require('./utils/logger');
app.use(logger.requestLogger);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/inbox', require('./routes/inbox'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/audit-log', require('./routes/auditLog'));
app.use('/api/profile', require('./routes/profile'));

// Initialize Lead Verifier
const verifier = require('./services/leadVerifier');
verifier.initialize();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    extensionConnected: extBridge.isConnected(),
    hasLinkedInSession: extBridge.getStatus().hasSession
  });
});

// ─── Production: Serve React Frontend ───
const path = require('path');
const clientBuildPath = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  // SPA catch-all: serve index.html for all non-API routes
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Global error handler (must be after all routes)
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

server.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`🔌 WebSocket Bridge on ws://localhost:${PORT}`);
  logger.info('📊 API endpoints ready');

  // Start the campaign engine (job queue + scanner)
  const campaignEngine = require('./services/engine');
  campaignEngine.start();
});
