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
      seats: 1,
      teamMembers: 1 // backward compat
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
      seats: 3,
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
      seats: 10,
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

function getUserSeatUsage(db, userId) {
  const user = db.prepare('SELECT activeWorkspaceId FROM users WHERE id = ?').get(userId);
  if (!user?.activeWorkspaceId) return { used: 1, limit: 1 };
  const used = db.prepare("SELECT COUNT(*) as c FROM workspace_members WHERE workspace_id = ? AND status = 'active'").get(user.activeWorkspaceId)?.c || 1;
  const plan = getUserPlan(db, userId);
  return { used, limit: plan.limits.seats };
}

module.exports = { PLANS, getUserPlan, getUserUsage, getUserSeatUsage };
