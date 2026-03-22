import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MetricGrid } from '@/components/shared/StatCard'
import { PageTabs } from '@/components/shared/PageTabs'
import { DataTable, TablePagination, RowActionMenu } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { UsageProgressCard } from '@/components/shared/UsageProgressCard'
import { AlertStrip } from '@/components/shared/AlertStrip'
import { mockSubscriptions } from '@/data/mock'
import { formatRelativeTime, planBadge, subscriptionStatusBadge, formatCurrency, paginateItems } from '@/lib/utils'
import type { SubscriptionRow, DashboardKPI } from '@/types'
import { ArrowUp, ArrowDown, CreditCard, AlertTriangle } from 'lucide-react'

const totalMrr = mockSubscriptions.reduce((s, sub) => s + sub.mrr, 0)
const activeSubs = mockSubscriptions.filter(s => s.status === 'active').length
const failedRenewals = mockSubscriptions.filter(s => s.status === 'past_due').length
const trials = mockSubscriptions.filter(s => s.status === 'trialing').length

const billingKpis: DashboardKPI[] = [
  { label: 'Total MRR', value: formatCurrency(totalMrr), delta: 12, trend: 'up', icon: 'DollarSign' },
  { label: 'Active Subscriptions', value: activeSubs, icon: 'CreditCard' },
  { label: 'Failed Renewals', value: failedRenewals, icon: 'AlertTriangle' },
  { label: 'Trials', value: trials, icon: 'Clock' },
]

export default function AdminBillingPage() {
  const [tab, setTab] = useState('subscriptions')
  const [page, setPage] = useState(0)
  const pageSize = 10
  const paginated = paginateItems(mockSubscriptions, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Billing" subtitle="Revenue, subscriptions, and payment health" />
      <MetricGrid metrics={billingKpis} columns={4} accentColor="text-amber-400" />

      {failedRenewals > 0 && (
        <AlertStrip level="error" title={`${failedRenewals} failed renewal(s) need attention`} message="Review past-due subscriptions to prevent service interruption." actionLabel="View" />
      )}

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 pt-4">
          <PageTabs
            tabs={[
              { id: 'subscriptions', label: 'Subscriptions', count: mockSubscriptions.length },
              { id: 'invoices', label: 'Invoices' },
              { id: 'failed', label: 'Failed Payments', count: failedRenewals },
            ]}
            activeTab={tab} onChange={setTab}
          />
        </div>

        {tab === 'subscriptions' && (
          <>
            <DataTable
              columns={[
                { key: 'workspace', header: 'Workspace', render: (s: SubscriptionRow) => (
                  <div><div className="text-sm font-medium text-zinc-200">{s.workspaceName}</div><div className="text-[11px] text-zinc-500">{s.ownerEmail}</div></div>
                )},
                { key: 'plan', header: 'Plan', render: (s: SubscriptionRow) => { const b = planBadge(s.plan); return <StatusBadge label={b.label} variant={b.variant} /> } },
                { key: 'status', header: 'Status', render: (s: SubscriptionRow) => { const b = subscriptionStatusBadge(s.status); return <StatusBadge label={b.label} variant={b.variant} /> } },
                { key: 'mrr', header: 'MRR', render: (s: SubscriptionRow) => <span className="text-sm font-semibold text-zinc-200">{formatCurrency(s.mrr)}</span> },
                { key: 'leads', header: 'Leads', render: (s: SubscriptionRow) => <span className="text-xs text-zinc-400">{s.leadUsage.used}/{s.leadUsage.limit}</span>, className: 'text-center' },
                { key: 'renewal', header: 'Renewal', render: (s: SubscriptionRow) => <span className="text-xs text-zinc-500">{s.renewalDate ? formatRelativeTime(s.renewalDate) : '—'}</span> },
                { key: 'actions', header: '', render: () => (
                  <RowActionMenu actions={[
                    { label: 'Override Plan', onClick: () => {} },
                    { label: 'View Stripe', onClick: () => {} },
                    { label: 'Cancel', onClick: () => {}, variant: 'danger' },
                  ]} />
                ), className: 'w-10' },
              ]}
              data={paginated.data}
              keyExtractor={(s) => s.id}
            />
            <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
        {tab !== 'subscriptions' && (
          <div className="p-12 text-center text-sm text-zinc-600">Content for {tab} tab</div>
        )}
      </div>
    </div>
  )
}
