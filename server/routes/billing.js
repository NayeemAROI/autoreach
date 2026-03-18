const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { PLANS, getUserPlan, getUserUsage } = require('../config/plans');

// Stripe (only init if key exists)
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey && !stripeKey.includes('REPLACE_ME') ? require('stripe')(stripeKey) : null;

// ---- Public route (no auth) ----

// GET plan definitions
router.get('/plans', (req, res) => {
  const plans = Object.values(PLANS).map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    interval: p.interval,
    limits: {
      leads: p.limits.leads === Infinity ? 'Unlimited' : p.limits.leads,
      campaigns: p.limits.campaigns === Infinity ? 'Unlimited' : p.limits.campaigns,
      dailyActions: p.limits.dailyActions,
      teamMembers: p.limits.teamMembers
    }
  }));
  res.json({ plans });
});

// ---- Protected routes ----
router.use(auth);

// GET current user's subscription + usage
router.get('/subscription', (req, res) => {
  try {
    const userId = req.user.id;
    const plan = getUserPlan(db, userId);
    const usage = getUserUsage(db, userId);
    const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY createdAt DESC LIMIT 1').get(userId);

    res.json({
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        limits: {
          leads: plan.limits.leads === Infinity ? 'Unlimited' : plan.limits.leads,
          campaigns: plan.limits.campaigns === Infinity ? 'Unlimited' : plan.limits.campaigns,
          dailyActions: plan.limits.dailyActions,
          teamMembers: plan.limits.teamMembers
        }
      },
      usage,
      subscription: sub ? {
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create Stripe Checkout session
router.post('/create-checkout', async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env' });

  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan || !plan.stripePriceId) {
      return res.status(400).json({ error: 'Invalid plan or missing Stripe price ID' });
    }

    const userId = req.user.id;
    const user = db.prepare('SELECT email, stripeCustomerId FROM users WHERE id = ?').get(userId);

    // Create or reuse Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId }
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripeCustomerId = ? WHERE id = ?').run(customerId, userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/billing?success=true`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/billing?canceled=true`,
      metadata: { userId, planId }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST create Stripe Customer Portal session
router.post('/create-portal', async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' });

  try {
    const user = db.prepare('SELECT stripeCustomerId FROM users WHERE id = ?').get(req.user.id);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/billing`
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST manually upgrade/downgrade (for demo/testing without Stripe)
router.post('/change-plan', (req, res) => {
  try {
    const { planId } = req.body;
    if (!PLANS[planId]) return res.status(400).json({ error: 'Invalid plan' });

    const userId = req.user.id;
    db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(planId, userId);

    // Upsert subscription record
    const existingSub = db.prepare('SELECT id FROM subscriptions WHERE user_id = ?').get(userId);
    if (existingSub) {
      db.prepare('UPDATE subscriptions SET plan = ?, status = ?, updatedAt = datetime(\'now\') WHERE user_id = ?').run(planId, 'active', userId);
    } else {
      db.prepare('INSERT INTO subscriptions (id, user_id, plan, status) VALUES (?, ?, ?, ?)').run(uuidv4(), userId, planId, 'active');
    }

    res.json({ message: `Plan changed to ${PLANS[planId].name}`, plan: planId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
