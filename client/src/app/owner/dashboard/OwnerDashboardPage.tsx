import { PageHeader } from '@/components/shared/PageHeader'
import { MetricGrid } from '@/components/shared/StatCard'
import { UsageProgressCard } from '@/components/shared/UsageProgressCard'
import { HealthBadge } from '@/components/shared/StatusBadge'
import { LineChartCard, BarChartCard } from '@/components/charts/ChartCard'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { SectionHeader } from '@/components/shared/PageHeader'
import { mockOwnerStats, mockLinkedInHealth, mockInboxThreads } from '@/data/mock'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import type { DashboardKPI } from '@/types'
import { Users, Rocket, UserPlus, MessageSquare, UserCheck, Reply, MessageCircle } from 'lucide-react'

const stats = mockOwnerStats

const kpis: DashboardKPI[] = [
  { label: 'Total Leads', value: stats.totalLeads, delta: 8, trend: 'up', deltaLabel: 'this week', icon: 'Users' },
  { label: 'Active Campaigns', value: stats.activeCampaigns, icon: 'Rocket' },
  { label: 'Invites Today', value: stats.invitesSentToday, icon: 'UserPlus' },
  { label: 'Messages Today', value: stats.messagesSentToday, icon: 'MessageSquare' },
  { label: 'Accepted', value: stats.acceptedConnections, delta: 12, trend: 'up', icon: 'UserCheck' },
  { label: 'Replies', value: stats.replies, delta: 5, trend: 'up', icon: 'Reply' },
]

export default function OwnerDashboardPage() {
  const li = mockLinkedInHealth

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Your workspace at a glance" />

      <MetricGrid metrics={kpis} columns={6} accentColor="text-violet-400" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LinkedIn Health */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="LinkedIn Account" />
            <HealthBadge health={li.sessionHealth} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Account</span><span className="text-zinc-300">{li.accountName || 'Not connected'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-zinc-500">Last Sync</span><span className="text-zinc-300">{li.lastSyncAt ? formatRelativeTime(li.lastSyncAt) : 'Never'}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <UsageProgressCard label="Invites" used={li.inviteUsage.used} limit={li.inviteUsage.limit} />
            <UsageProgressCard label="Messages" used={li.messageUsage.used} limit={li.messageUsage.limit} />
          </div>
        </div>

        {/* Pending */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <SectionHeader title="Pending Tasks" />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-800/40 border border-zinc-800/30">
              <span className="text-sm text-zinc-300">Enrichment Pending</span>
              <span className="text-sm font-bold text-amber-400">{stats.enrichmentPending}</span>
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-800/40 border border-zinc-800/30">
              <span className="text-sm text-zinc-300">Verification Pending</span>
              <span className="text-sm font-bold text-amber-400">{stats.verificationPending}</span>
            </div>
          </div>
        </div>

        {/* Recent Replies */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <SectionHeader title="Recent Replies" />
          <div className="mt-3">
            <ActivityTimeline
              maxItems={4}
              events={mockInboxThreads.filter(t => t.unread).map(t => ({
                id: t.id,
                title: t.leadName,
                subtitle: t.lastMessage.slice(0, 60) + '...',
                timestamp: t.lastMessageAt,
                icon: <MessageCircle className="w-3.5 h-3.5" />,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChartCard title="Campaign Funnel" subtitle="Lead progression" data={stats.campaignFunnel.map(f => ({ name: f.step, value: f.count }))} bars={[{ dataKey: 'value', color: '#8b5cf6' }]} xKey="name" />
        <BarChartCard title="Daily Activity" subtitle="This week" data={stats.dailyActivity} bars={[{ dataKey: 'invites', color: '#06b6d4' }, { dataKey: 'messages', color: '#8b5cf6' }, { dataKey: 'replies', color: '#22c55e' }]} xKey="date" />
      </div>
    </div>
  )
}
