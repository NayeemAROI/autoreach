import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { MetricGrid } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { formatCurrency } from '@/lib/utils'
import type { DashboardKPI } from '@/types'
import { CreditCard, ArrowUpCircle } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

const PLAN_TIERS = [
  { id: 'free', name: 'Free', price: 0, leads: 100, campaigns: 2 },
  { id: 'pro', name: 'Pro', price: 49, leads: 5000, campaigns: 20 },
  { id: 'business', name: 'Business', price: 149, leads: 25000, campaigns: 100 },
]

export default function OwnerBillingPage() {
  const { data: billingData } = useApi<any>('/api/billing/status')
  const b = billingData || {}
  const currentPlan = b.plan || 'free'
  const tier = PLAN_TIERS.find(t => t.id === currentPlan) || PLAN_TIERS[0]

  const kpis: DashboardKPI[] = [
    { label: 'Current Plan', value: tier.name, icon: 'CreditCard' },
    { label: 'Monthly Cost', value: formatCurrency(tier.price), icon: 'DollarSign' },
    { label: 'Lead Limit', value: tier.leads.toLocaleString(), icon: 'Users' },
    { label: 'Campaign Limit', value: tier.campaigns, icon: 'Rocket' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Billing" subtitle="Manage your subscription and usage">
        {currentPlan !== 'business' && (
          <QuickActionButton icon={<ArrowUpCircle className="w-4 h-4" />} label="Upgrade Plan" onClick={() => window.location.href = '/billing'} variant="primary" />
        )}
      </PageHeader>

      <MetricGrid metrics={kpis} columns={4} accentColor="text-emerald-400" />

      {/* Plan Comparison */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/40">
          <SectionHeader title="Available Plans" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-zinc-800/40">
          {PLAN_TIERS.map(plan => (
            <div key={plan.id} className={`p-5 ${plan.id === currentPlan ? 'bg-violet-500/5 border-l-2 border-l-violet-500' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                {plan.id === currentPlan && <StatusBadge label="Current" variant="success" />}
              </div>
              <p className="text-2xl font-bold text-white mb-4">{plan.price === 0 ? 'Free' : `$${plan.price}/mo`}</p>
              <div className="space-y-2 text-sm text-zinc-400">
                <p>✓ {plan.leads.toLocaleString()} leads</p>
                <p>✓ {plan.campaigns} campaigns</p>
                <p>✓ {plan.id === 'free' ? 'Basic' : plan.id === 'pro' ? 'Priority' : 'Dedicated'} support</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Details */}
      {b.subscription && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <SectionHeader title="Subscription Details" />
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-500">Status</span><StatusBadge label={b.subscription.status} variant={b.subscription.status === 'active' ? 'success' : 'warning'} /></div>
            <div className="flex justify-between"><span className="text-zinc-500">Period End</span><span className="text-zinc-300">{b.subscription.currentPeriodEnd || 'N/A'}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
