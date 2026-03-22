import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { UsageProgressCard } from '@/components/shared/UsageProgressCard'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable } from '@/components/tables/DataTable'
import { mockBillingHistory } from '@/data/mock'
import { PLAN_TIERS } from '@/lib/constants'
import { formatDate, formatCurrency, planBadge } from '@/lib/utils'
import type { BillingHistoryItem } from '@/types'
import { CreditCard, ExternalLink, ArrowUpRight } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

const currentPlan = PLAN_TIERS.business

export default function OwnerBillingPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Billing" subtitle="Subscription and usage management">
        <QuickActionButton icon={<ArrowUpRight className="w-4 h-4" />} label="Upgrade Plan" onClick={() => {}} variant="primary" />
      </PageHeader>

      {/* Current Plan */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">{currentPlan.label} Plan</h3>
                <StatusBadge label="Active" variant="success" />
              </div>
              <p className="text-xs text-zinc-500">{formatCurrency(currentPlan.price)}/month · Renews Apr 15, 2026</p>
            </div>
          </div>
          <div className="flex gap-2">
            <QuickActionButton icon={<ExternalLink className="w-3.5 h-3.5" />} label="Manage" onClick={() => {}} />
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UsageProgressCard label="Leads" used={2480} limit={currentPlan.leads} />
        <UsageProgressCard label="Team Members" used={5} limit={currentPlan.members} />
        <UsageProgressCard label="Connected Accounts" used={1} limit={currentPlan.connectedAccounts} />
      </div>

      {/* Billing History */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/40">
          <SectionHeader title="Billing History" />
        </div>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', render: (i: BillingHistoryItem) => <span className="text-sm text-zinc-300">{formatDate(i.date)}</span> },
            { key: 'desc', header: 'Description', render: (i: BillingHistoryItem) => <span className="text-sm text-zinc-300">{i.description}</span> },
            { key: 'amount', header: 'Amount', render: (i: BillingHistoryItem) => <span className="text-sm font-semibold text-zinc-200">{formatCurrency(i.amount)}</span> },
            { key: 'status', header: 'Status', render: (i: BillingHistoryItem) => <StatusBadge label={i.status} variant={i.status === 'paid' ? 'success' : i.status === 'failed' ? 'danger' : i.status === 'refunded' ? 'warning' : 'info'} /> },
          ]}
          data={mockBillingHistory}
          keyExtractor={(i) => i.id}
        />
      </div>

      {/* Plan Comparison */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/40">
          <SectionHeader title="Plan Comparison" />
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/40">
              <th className="text-left px-5 py-3 text-[11px] uppercase text-zinc-500 font-semibold">Feature</th>
              {Object.values(PLAN_TIERS).map(p => (
                <th key={p.label} className="text-center px-5 py-3 text-[11px] uppercase text-zinc-500 font-semibold">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Price', key: 'price', fmt: (v: number) => v === 0 ? 'Free' : `$${v}/mo` },
              { label: 'Leads', key: 'leads', fmt: (v: number) => v.toLocaleString() },
              { label: 'Members', key: 'members', fmt: (v: number) => v.toString() },
              { label: 'Campaigns', key: 'campaigns', fmt: (v: number) => v.toString() },
              { label: 'Daily Invites', key: 'dailyInvites', fmt: (v: number) => v.toString() },
            ].map(row => (
              <tr key={row.key} className="border-b border-zinc-800/30">
                <td className="px-5 py-3 text-sm text-zinc-300">{row.label}</td>
                {Object.values(PLAN_TIERS).map(p => (
                  <td key={p.label} className="text-center px-5 py-3 text-sm text-zinc-400">{row.fmt((p as any)[row.key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
