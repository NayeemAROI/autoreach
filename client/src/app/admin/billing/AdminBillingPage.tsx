import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MetricGrid } from '@/components/shared/StatCard'
import { PageTabs } from '@/components/shared/PageTabs'
import { DataTable, TablePagination, RowActionMenu } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { formatCurrency, paginateItems } from '@/lib/utils'
import type { DashboardKPI } from '@/types'

export default function AdminBillingPage() {
  const [tab, setTab] = useState('subscriptions')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const { data: billingData } = useApi<any>('/api/admin/billing')
  const b = billingData || {}
  const subscriptions = b.subscriptions || []
  const stats = b.stats || {}

  const billingKpis: DashboardKPI[] = [
    { label: 'Total MRR', value: formatCurrency(b.totalMrr || 0), icon: 'DollarSign' },
    { label: 'Active Subscriptions', value: b.activeSubs || 0, icon: 'CreditCard' },
    { label: 'Free Plans', value: stats.free || 0, icon: 'Users' },
    { label: 'Pro Plans', value: stats.pro || 0, icon: 'Rocket' },
    { label: 'Business Plans', value: stats.business || 0, icon: 'Building2' },
  ]

  const filteredSubs = tab === 'subscriptions' ? subscriptions
    : tab === 'active' ? subscriptions.filter((s: any) => s.status === 'active')
    : subscriptions.filter((s: any) => s.plan === 'free' || !s.plan)

  const paginated = paginateItems(filteredSubs, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Billing" subtitle="Revenue, subscriptions, and payment health" />
      <MetricGrid metrics={billingKpis} columns={5} accentColor="text-amber-400" />

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 pt-4">
          <PageTabs
            tabs={[
              { id: 'subscriptions', label: 'All Users', count: subscriptions.length },
              { id: 'active', label: 'Active Subs', count: subscriptions.filter((s: any) => s.status === 'active').length },
              { id: 'free', label: 'Free Plans', count: subscriptions.filter((s: any) => s.plan === 'free' || !s.plan).length },
            ]}
            activeTab={tab} onChange={(t) => { setTab(t); setPage(0); }}
          />
        </div>

        <DataTable
          columns={[
            { key: 'user', header: 'User', render: (s: any) => (
              <div><div className="text-sm font-medium text-zinc-200">{s.name}</div><div className="text-[11px] text-zinc-500">{s.email}</div></div>
            )},
            { key: 'plan', header: 'Plan', render: (s: any) => <StatusBadge label={s.plan || 'free'} variant={s.plan === 'business' ? 'warning' : s.plan === 'pro' ? 'info' : 'neutral'} /> },
            { key: 'status', header: 'Status', render: (s: any) => <StatusBadge label={s.status || 'none'} variant={s.status === 'active' ? 'success' : s.status === 'past_due' ? 'danger' : 'neutral'} /> },
            { key: 'leads', header: 'Leads', render: (s: any) => <span className="text-sm text-zinc-300">{s.leadCount || 0}</span>, className: 'text-center' },
            { key: 'actions', header: '', render: (s: any) => (
              <RowActionMenu actions={[
                { label: 'Override Plan', onClick: () => {} },
                { label: 'Cancel', onClick: () => {}, variant: 'danger' as const },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(s: any) => s.id}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  )
}
