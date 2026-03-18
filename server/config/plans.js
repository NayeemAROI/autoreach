// Plan definitions and limits
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    limits: {
      leads: 100,
      campaigns: 2,
      dailyActions: 25,
      teamMembers: 1
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 4900, // cents
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_PRO || '',
    limits: {
      leads: 2500,
      campaigns: 15,
      dailyActions: 150,
      teamMembers: 3
    }
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 14900, // cents
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || '',
    limits: {
      leads: Infinity,
      campaigns: Infinity,
      dailyActions: 500,
      teamMembers: 10
    }
  }
};

function getUserPlan(db, userId) {
  const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(userId);
  const planId = user?.plan || 'free';
  return PLANS[planId] || PLANS.free;
}

function getUserUsage(db, userId) {
  const leads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE user_id = ?').get(userId).count;
  const campaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE user_id = ?').get(userId).count;
  const todayActions = db.prepare("SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND date(timestamp) = date('now')").get(userId).count;
  return { leads, campaigns, todayActions };
}

module.exports = { PLANS, getUserPlan, getUserUsage };
