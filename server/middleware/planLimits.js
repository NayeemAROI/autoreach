const db = require('../db/database');
const { getUserPlan, getUserUsage } = require('../config/plans');

function checkLeadLimit(req, res, next) {
  const plan = getUserPlan(db, req.user.id);
  const usage = getUserUsage(db, req.user.id);
  if (usage.leads >= plan.limits.leads) {
    return res.status(403).json({
      error: 'Lead limit reached',
      message: `Your ${plan.name} plan allows ${plan.limits.leads} leads. Upgrade to add more.`,
      upgrade: true
    });
  }
  next();
}

function checkCampaignLimit(req, res, next) {
  const plan = getUserPlan(db, req.user.id);
  const usage = getUserUsage(db, req.user.id);
  if (usage.campaigns >= plan.limits.campaigns) {
    return res.status(403).json({
      error: 'Campaign limit reached',
      message: `Your ${plan.name} plan allows ${plan.limits.campaigns} campaigns. Upgrade to add more.`,
      upgrade: true
    });
  }
  next();
}

function checkDailyActionLimit(req, res, next) {
  const plan = getUserPlan(db, req.user.id);
  const usage = getUserUsage(db, req.user.id);
  if (usage.todayActions >= plan.limits.dailyActions) {
    return res.status(403).json({
      error: 'Daily action limit reached',
      message: `Your ${plan.name} plan allows ${plan.limits.dailyActions} daily actions. Upgrade for more.`,
      upgrade: true
    });
  }
  next();
}

module.exports = { checkLeadLimit, checkCampaignLimit, checkDailyActionLimit };
