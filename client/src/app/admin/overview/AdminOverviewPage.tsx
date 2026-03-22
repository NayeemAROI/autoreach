import { PageHeader } from '@/components/shared/PageHeader'
import { MetricGrid } from '@/components/shared/StatCard'
import { AlertStrip } from '@/components/shared/AlertStrip'
import { LineChartCard, BarChartCard, DonutChartCard } from '@/components/charts/ChartCard'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { SectionHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { mockAdminStats, mockUsers, mockWorkspaces, mockAuditLogs, mockSystemAlerts } from '@/data/mock'
import { formatRelativeTime, userStatusBadge, planBadge, formatCurrency } from '@/lib/utils'
import type { DashboardKPI } from '@/types'
import { Users, Building2, Rocket, MessageSquare, UserPlus, DollarSign, Activity } from 'lucide-react'
import { useState } from 'react'

const stats = mockAdminStats

const kpis: DashboardKPI[] = [
  { label: 'Total Users', value: stats.totalUsers, delta: 18, trend: 'up', deltaLabel: 'vs last month', icon: 'Users' },
  { label: 'Active Workspaces', value: stats.activeWorkspaces, delta: 14, trend: 'up', deltaLabel: 'vs last month', icon: 'Building2' },
  { label: 'Live Campaigns', value: stats.liveCampaigns, delta: 6, trend: 'up', deltaLabel: 'this week', icon: 'Rocket' },
  { label: 'Messages Today', value: stats.messagesSentToday, icon: 'MessageSquare' },
  { label: 'Invites Today', value: stats.invitesSentToday, icon: 'UserPlus' },
  { label: 'MRR', value: formatCurrency(stats.mrr), delta: 12, trend: 'up', deltaLabel: 'vs last month', icon: 'DollarSign' },
]

export default function AdminOverviewPage() {
  const [alerts, setAlerts] = useState(mockSystemAlerts.filter(a => !a.dismissed))

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Overview" subtitle="Real-time platform health and metrics" />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map(alert => (
            <AlertStrip
              key={alert.id}
              level={alert.level}
              title={alert.title}
              message={alert.message}
              actionLabel={alert.actionLabel}
              onDismiss={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            />
          ))}
        </div>
      )}

      {/* KPIs */}
      <MetricGrid metrics={kpis} columns={6} accentColor="text-amber-400" />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartCard title="User Growth" subtitle="Monthly new registrations" data={stats.userGrowth} dataKey="value" color="#f59e0b" />
        <LineChartCard title="Workspace Growth" subtitle="Monthly new workspaces" data={stats.workspaceGrowth} dataKey="value" color="#8b5cf6" />
        <BarChartCard title="Invites vs Messages" subtitle="Daily volume this week" data={stats.invitesVsMessages} bars={[{ dataKey: 'invites', color: '#06b6d4' }, { dataKey: 'messages', color: '#8b5cf6' }]} xKey="date" />
        <DonutChartCard title="Plan Distribution" subtitle="Active subscriptions" data={stats.planDistribution.map(p => ({ name: p.plan, value: p.count }))} />
      </div>

      {/* Bottom Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Signups */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/40">
            <SectionHeader title="Recent Signups" />
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'User', render: (u) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center text-amber-400 text-xs font-bold">{u.name[0]}</div>
                  <div><div className="text-sm font-medium text-zinc-200">{u.name}</div><div className="text-[11px] text-zinc-500">{u.email}</div></div>
                </div>
              )},
              { key: 'plan', header: 'Plan', render: (u) => { const b = planBadge(u.plan); return <StatusBadge label={b.label} variant={b.variant} /> } },
              { key: 'joined', header: 'Joined', render: (u) => <span className="text-xs text-zinc-500">{formatRelativeTime(u.createdAt)}</span> },
            ]}
            data={mockUsers.slice(0, 5)}
            keyExtractor={(u) => u.id}
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
              events={mockAuditLogs.slice(0, 6).map(log => ({
                id: log.id,
                title: log.action.replace(/\./g, ' → ').replace(/_/g, ' '),
                subtitle: `${log.actor}${log.target ? ` · ${log.target}` : ''}`,
                timestamp: log.timestamp,
                icon: <Activity className="w-3.5 h-3.5" />,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
