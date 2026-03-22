import { PageHeader } from '@/components/shared/PageHeader'
import { MetricGrid } from '@/components/shared/StatCard'
import { UsageProgressCard } from '@/components/shared/UsageProgressCard'
import { HealthBadge } from '@/components/shared/StatusBadge'
import { BarChartCard } from '@/components/charts/ChartCard'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { SectionHeader } from '@/components/shared/PageHeader'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime } from '@/lib/utils'
import type { DashboardKPI } from '@/types'
import { MessageCircle } from 'lucide-react'

export default function OwnerDashboardPage() {
  const { data: stats } = useApi<any>('/api/stats/overview')
  const { data: liData } = useApi<any>('/api/integrations/status')
  const { data: inboxData } = useApi<any>('/api/inbox')
  const { data: chartData } = useApi<any>('/api/stats/chart?range=weekly')

  const s = stats || {}
  const li = liData || {}
  const threads = inboxData?.conversations || inboxData?.threads || []
  const chart = chartData?.data || []

  const kpis: DashboardKPI[] = [
    { label: 'Total Leads', value: s.totalLeads || 0, delta: s.leadsChange || 0, trend: (s.leadsChange || 0) >= 0 ? 'up' : 'down', deltaLabel: 'vs last month', icon: 'Users' },
    { label: 'Active Campaigns', value: s.activeCampaigns || 0, icon: 'Rocket' },
    { label: 'Connection Rate', value: `${s.connectionRate || 0}%`, icon: 'UserPlus' },
    { label: 'Reply Rate', value: `${s.replyRate || 0}%`, icon: 'MessageSquare' },
    { label: 'Today\'s Actions', value: s.todayActions || 0, icon: 'Activity' },
    { label: 'Pending', value: s.pendingLeads || 0, icon: 'Clock' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Your workspace at a glance" />

      <MetricGrid metrics={kpis} columns={6} accentColor="text-violet-400" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LinkedIn Health */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="LinkedIn Account" />
            <HealthBadge health={li.sessionHealth || li.health || 'unknown'} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Account</span><span className="text-zinc-300">{li.accountName || li.linkedinEmail || 'Not connected'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Status</span><span className="text-zinc-300">{li.connected ? 'Connected' : 'Not connected'}</span></div>
          </div>
          {li.inviteUsage && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <UsageProgressCard label="Invites" used={li.inviteUsage?.used || 0} limit={li.inviteUsage?.limit || 100} />
              <UsageProgressCard label="Messages" used={li.messageUsage?.used || 0} limit={li.messageUsage?.limit || 100} />
            </div>
          )}
        </div>

        {/* Pending */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <SectionHeader title="Pending Tasks" />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-800/40 border border-zinc-800/30">
              <span className="text-sm text-zinc-300">Pending Leads</span>
              <span className="text-sm font-bold text-amber-400">{s.pendingLeads || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-800/40 border border-zinc-800/30">
              <span className="text-sm text-zinc-300">Connected</span>
              <span className="text-sm font-bold text-emerald-400">{s.connectedLeads || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Replies */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <SectionHeader title="Recent Replies" />
          <div className="mt-3">
            <ActivityTimeline
              maxItems={4}
              events={threads.filter((t: any) => t.unread).slice(0, 4).map((t: any) => ({
                id: t.id,
                title: t.leadName || t.lead_name || 'Lead',
                subtitle: (t.lastMessage || t.last_message || '').slice(0, 60) + '...',
                timestamp: t.lastMessageAt || t.updated_at || t.createdAt,
                icon: <MessageCircle className="w-3.5 h-3.5" />,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      {chart.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BarChartCard title="Daily Activity" subtitle="This week" data={chart} bars={[{ dataKey: 'connections', color: '#06b6d4' }, { dataKey: 'messages', color: '#8b5cf6' }, { dataKey: 'replies', color: '#22c55e' }]} xKey="date" />
        </div>
      )}
    </div>
  )
}
