import { useState, useEffect } from 'react'
import { Check, Zap, Crown, Rocket, ArrowRight, ExternalLink, Sparkles } from 'lucide-react'
import { apiFetch } from '../utils/api'

const PLAN_FEATURES = {
  free: [
    '100 Leads',
    '2 Campaigns',
    '25 Daily Actions',
    '1 Team Member',
    'Basic Analytics',
  ],
  pro: [
    '2,500 Leads',
    '15 Campaigns',
    '150 Daily Actions',
    '3 Team Members',
    'Advanced Analytics',
    'Priority Support',
  ],
  business: [
    'Unlimited Leads',
    'Unlimited Campaigns',
    '500 Daily Actions',
    '10 Team Members',
    'Advanced Analytics',
    'Priority Support',
    'Custom Integrations',
    'Dedicated Account Manager',
  ]
}

const PLAN_ICONS = {
  free: Rocket,
  pro: Zap,
  business: Crown
}

const PLAN_COLORS = {
  free: { accent: '#6b7280', gradient: 'from-gray-500/20 to-gray-600/5' },
  pro: { accent: '#6366f1', gradient: 'from-primary/20 to-accent/5' },
  business: { accent: '#f59e0b', gradient: 'from-amber-500/20 to-orange-500/5' },
}

export default function Billing() {
  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [usage, setUsage] = useState(null)
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/api/billing/plans').then(r => r.json()),
      apiFetch('/api/billing/subscription').then(r => r.json()),
    ]).then(([plansRes, subRes]) => {
      setPlans(plansRes.plans || [])
      setSubscription(subRes.subscription)
      setUsage(subRes.usage)
      setCurrentPlan(subRes.plan)
      setLoading(false)
    }).catch(err => {
      console.error('Error loading billing:', err)
      setLoading(false)
    })
  }, [])

  const handleChangePlan = async (planId) => {
    setChangingPlan(planId)
    try {
      // Try Stripe checkout first
      const checkoutRes = await apiFetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })
      const checkoutData = await checkoutRes.json()
      
      if (checkoutData.url) {
        window.location.href = checkoutData.url
        return
      }

      // Fall back to direct plan change (dev mode)
      const res = await apiFetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      })
      const data = await res.json()
      if (res.ok) {
        // Refresh
        const subRes = await apiFetch('/api/billing/subscription').then(r => r.json())
        setCurrentPlan(subRes.plan)
        setUsage(subRes.usage)
        setSubscription(subRes.subscription)
      }
    } catch (err) {
      console.error('Plan change error:', err)
    }
    setChangingPlan('')
  }

  const handleManageBilling = async () => {
    try {
      const res = await apiFetch('/api/billing/create-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Portal error:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="glass-card h-96 shimmer"></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Choose Your Plan</h1>
        <p className="text-sm text-text-muted">Scale your outreach with the right plan for your needs</p>
      </div>

      {/* Usage Summary */}
      {usage && currentPlan && (
        <div className="glass-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-text-primary">Current Usage — {currentPlan.name} Plan</span>
            </div>
            {subscription && (
              <button onClick={handleManageBilling}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary-light transition-colors cursor-pointer">
                Manage Billing <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Leads', used: usage.leads, limit: currentPlan.limits.leads },
              { label: 'Campaigns', used: usage.campaigns, limit: currentPlan.limits.campaigns },
              { label: 'Daily Actions', used: usage.todayActions, limit: currentPlan.limits.dailyActions },
            ].map((item, i) => {
              const isUnlimited = item.limit === 'Unlimited'
              const pct = isUnlimited ? 0 : Math.min((item.used / item.limit) * 100, 100)
              const isNear = !isUnlimited && pct >= 80
              return (
                <div key={i} className="p-3 rounded-xl bg-bg-secondary border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{item.label}</span>
                    <span className={`text-xs font-bold ${isNear ? 'text-danger' : 'text-text-primary'}`}>
                      {item.used} / {isUnlimited ? '∞' : item.limit}
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: 4 }}>
                    <div className={`progress-fill ${isNear ? '!bg-danger' : ''}`} style={{ width: `${isUnlimited ? 0 : pct}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan?.id === plan.id
          const Icon = PLAN_ICONS[plan.id] || Rocket
          const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.free
          const features = PLAN_FEATURES[plan.id] || []
          const isPopular = plan.id === 'pro'

          return (
            <div key={plan.id} className={`relative glass-card p-6 animate-fade-in transition-all duration-300 hover:scale-[1.02] ${isCurrentPlan ? 'ring-2 ring-primary' : ''} ${isPopular ? 'ring-2 ring-primary/50' : ''}`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ background: 'var(--color-primary)', color: 'white' }}>
                  Most Popular
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-success/20 text-success border border-success/30">
                  Current Plan
                </div>
              )}

              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-4 mt-2`}>
                <Icon className="w-5 h-5" style={{ color: colors.accent }} />
              </div>

              <h3 className="text-lg font-bold text-text-primary mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-text-primary">
                  ${plan.price ? (plan.price / 100) : 0}
                </span>
                {plan.interval && <span className="text-sm text-text-muted">/{plan.interval}</span>}
                {!plan.interval && <span className="text-sm text-text-muted">forever</span>}
              </div>

              <div className="space-y-3 mb-8">
                {features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${colors.accent}20` }}>
                      <Check className="w-2.5 h-2.5" style={{ color: colors.accent }} />
                    </div>
                    <span className="text-text-secondary">{feat}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={isCurrentPlan || !!changingPlan}
                onClick={() => handleChangePlan(plan.id)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                  isCurrentPlan
                    ? 'bg-bg-secondary text-text-muted border border-border'
                    : plan.id === 'free'
                    ? 'bg-bg-elevated text-text-primary border border-border hover:border-text-muted'
                    : isPopular
                    ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/25'
                    : 'bg-bg-elevated text-text-primary border border-border hover:border-primary/50'
                }`}
              >
                {changingPlan === plan.id ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : (
                  <>
                    {plan.price > (currentPlan?.price || 0) ? 'Upgrade' : 'Switch'} to {plan.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Subscription Info */}
      {subscription && (
        <div className="glass-card p-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Subscription Details</h3>
              <p className="text-xs text-text-muted">
                Status: <span className={`font-bold ${subscription.status === 'active' ? 'text-success' : 'text-warning'}`}>{subscription.status}</span>
                {subscription.currentPeriodEnd && (
                  <> · Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                )}
                {subscription.cancelAtPeriodEnd && (
                  <span className="text-danger font-bold"> · Cancels at period end</span>
                )}
              </p>
            </div>
            <button onClick={handleManageBilling}
              className="px-4 py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer">
              Manage Subscription
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
