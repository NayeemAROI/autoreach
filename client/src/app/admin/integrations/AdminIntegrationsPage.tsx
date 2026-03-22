import { PageHeader } from '@/components/shared/PageHeader'
import { HealthBadge, StatusBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { MetricGrid } from '@/components/shared/StatCard'
import { DataTable } from '@/components/tables/DataTable'
import { EmptyState } from '@/components/shared/Feedback'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime } from '@/lib/utils'
import type { DashboardKPI } from '@/types'
import { Plug, RefreshCw } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function AdminIntegrationsPage() {
  const { data: intData, refetch } = useApi<any>('/api/admin/integrations')
  const integrations = intData?.integrations || []
  const summary = intData?.summary || {}

  const kpis: DashboardKPI[] = [
    { label: 'Total Users', value: summary.total || 0, icon: 'Users' },
    { label: 'Connected', value: summary.connected || 0, icon: 'Link2' },
    { label: 'Disconnected', value: summary.disconnected || 0, icon: 'Unlink' },
    { label: 'Issues', value: summary.issues || 0, icon: 'AlertTriangle' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Integrations" subtitle="LinkedIn integration health across all users">
        <QuickActionButton icon={<RefreshCw className="w-4 h-4" />} label="Refresh" onClick={refetch} />
      </PageHeader>

      <MetricGrid metrics={kpis} columns={4} accentColor="text-cyan-400" />

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <DataTable
          columns={[
            { key: 'user', header: 'User', render: (i: any) => (
              <div><div className="text-sm font-medium text-zinc-200">{i.userName}</div><div className="text-[11px] text-zinc-500">{i.userEmail}</div></div>
            )},
            { key: 'provider', header: 'Provider', render: (i: any) => <span className="text-sm text-zinc-300">{i.provider}</span> },
            { key: 'status', header: 'Status', render: (i: any) => <StatusBadge label={i.status} variant={i.status === 'active' ? 'success' : i.status === 'checkpoint' ? 'warning' : 'danger'} /> },
            { key: 'health', header: 'Health', render: (i: any) => <HealthBadge health={i.health} /> },
            { key: 'lastSync', header: 'Last Sync', render: (i: any) => <span className="text-xs text-zinc-500">{i.lastSync ? formatRelativeTime(i.lastSync) : 'Never'}</span> },
          ]}
          data={integrations}
          keyExtractor={(i: any) => `${i.userId}-${i.accountId}`}
        />
        {integrations.length === 0 && (
          <EmptyState icon={<Plug className="w-7 h-7" />} title="No integrations" description="No users have connected LinkedIn yet." />
        )}
      </div>
    </div>
  )
}
