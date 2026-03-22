import { PageHeader } from '@/components/shared/PageHeader'
import { MetricGrid } from '@/components/shared/StatCard'
import { AlertStrip } from '@/components/shared/AlertStrip'
import { LineChartCard, BarChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { SectionHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime, planBadge, formatCurrency } from '@/lib/utils'
import type { DashboardKPI } from '@/types'
import { Activity } from 'lucide-react'

export default function AdminOverviewPage() {
  const { data: adminStats } = useApi<any>('/api/admin/stats')
  const { data: usersData } = useApi<any>('/api/admin/users')
  const { data: auditData } = useApi<any>('/api/admin/audit-log?limit=6')

  const s = adminStats || { totalUsers: 0, totalLeads: 0, totalCampaigns: 0, activeCampaigns: 0 }
  const users = usersData?.users || []
  const logs = auditData?.logs || []

  const kpis: DashboardKPI[] = [
    { label: 'Total Users', value: s.totalUsers, icon: 'Users' },
    { label: 'Total Leads', value: s.totalLeads, icon: 'Building2' },
    { label: 'Total Campaigns', value: s.totalCampaigns, icon: 'Rocket' },
    { label: 'Active Campaigns', value: s.activeCampaigns, icon: 'Activity' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Overview" subtitle="Real-time platform health and metrics" />

      {/* KPIs */}
      <MetricGrid metrics={kpis} columns={4} accentColor="text-amber-400" />

      {/* Bottom Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Signups */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/40">
            <SectionHeader title="Recent Signups" />
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'User', render: (u: any) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center text-amber-400 text-xs font-bold">{u.name?.[0] || '?'}</div>
                  <div><div className="text-sm font-medium text-zinc-200">{u.name}</div><div className="text-[11px] text-zinc-500">{u.email}</div></div>
                </div>
              )},
              { key: 'workspaces', header: 'Workspaces', render: (u: any) => <span className="text-sm text-zinc-300">{u.workspaceCount || 0}</span> },
              { key: 'joined', header: 'Joined', render: (u: any) => <span className="text-xs text-zinc-500">{formatRelativeTime(u.createdAt)}</span> },
            ]}
            data={users.slice(0, 5)}
            keyExtractor={(u: any) => u.id}
          />
        </div>

        {/* Recent Events */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/40">
            <SectionHeader title="Recent Platform Events" />
          </div>
          <div className="px-5 py-3">
            <ActivityTimeline
              maxItems={6}
              events={logs.map((log: any) => ({
                id: log.id,
                title: (log.action || '').replace(/\./g, ' → ').replace(/_/g, ' '),
                subtitle: `${log.actor || log.userId || 'System'}${log.target ? ` · ${log.target}` : ''}`,
                timestamp: log.timestamp || log.createdAt,
                icon: <Activity className="w-3.5 h-3.5" />,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
