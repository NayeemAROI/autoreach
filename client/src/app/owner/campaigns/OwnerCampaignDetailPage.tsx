import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageTabs } from '@/components/shared/PageTabs'
import { MetricGrid } from '@/components/shared/StatCard'
import { StatusBadge, HealthBadge } from '@/components/shared/StatusBadge'
import { DataTable, TablePagination } from '@/components/tables/DataTable'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { mockCampaignDetail, mockCampaignLeads } from '@/data/mock'
import { formatRelativeTime, campaignStatusBadge, paginateItems } from '@/lib/utils'
import type { DashboardKPI, CampaignLeadRow, SequenceStep } from '@/types'
import { Pause, Play, Copy, Trash2, ArrowLeft } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { useNavigate } from 'react-router-dom'

const cd = mockCampaignDetail

const kpis: DashboardKPI[] = [
  { label: 'Total Leads', value: cd.totalLeads },
  { label: 'Invites Sent', value: cd.invitesSent },
  { label: 'Accepted', value: cd.accepted },
  { label: 'Replied', value: cd.replied },
]

export default function OwnerCampaignDetailPage() {
  const [tab, setTab] = useState('overview')
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const paginated = paginateItems(mockCampaignLeads, page, 10)
  const b = campaignStatusBadge(cd.status)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/owner/campaigns')} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{cd.name}</h1>
            <StatusBadge label={b.label} variant={b.variant} />
          </div>
          <p className="text-sm text-zinc-500 mt-1">Created by {cd.createdBy} · Sender: {cd.senderAccount}</p>
        </div>
        <div className="flex gap-2">
          <QuickActionButton icon={<Pause className="w-4 h-4" />} label="Pause" onClick={() => {}} />
          <QuickActionButton icon={<Copy className="w-4 h-4" />} label="Duplicate" onClick={() => {}} />
          <QuickActionButton icon={<Trash2 className="w-4 h-4" />} label="Delete" onClick={() => {}} />
        </div>
      </div>

      <PageTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'sequence', label: 'Sequence', count: cd.sequence.length },
          { id: 'leads', label: 'Leads', count: cd.totalLeads },
          { id: 'logs', label: 'Logs' },
          { id: 'settings', label: 'Settings' },
        ]}
        activeTab={tab} onChange={setTab}
      />

      {tab === 'overview' && (
        <div className="space-y-5">
          <MetricGrid metrics={kpis} columns={4} accentColor="text-violet-400" />
          {cd.errors.length > 0 && (
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
              <h3 className="text-sm font-semibold text-red-400 mb-3">Recent Errors</h3>
              {cd.errors.map((e, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-zinc-800/30 last:border-0">
                  <span className="text-sm text-zinc-400">{e.message}</span>
                  <span className="text-xs text-zinc-600">{formatRelativeTime(e.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sequence' && (
        <div className="space-y-3">
          {cd.sequence.map((step: SequenceStep, i: number) => (
            <div key={step.id} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold shrink-0">{i + 1}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{step.label}</span>
                  <span className="text-[10px] text-zinc-600 font-mono uppercase">{step.type}</span>
                </div>
                {step.stats && (
                  <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                    <span>Sent: {step.stats.sent}</span><span>Delivered: {step.stats.delivered}</span>
                    <span className="text-emerald-400">Replied: {step.stats.replied}</span><span className="text-red-400">Failed: {step.stats.failed}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'leads' && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
          <DataTable
            columns={[
              { key: 'name', header: 'Lead', render: (l: CampaignLeadRow) => (
                <div><div className="text-sm text-zinc-200">{l.leadName}</div><div className="text-[11px] text-zinc-500">{l.company}</div></div>
              )},
              { key: 'step', header: 'Current Step', render: (l: CampaignLeadRow) => <span className="text-xs text-zinc-400">{l.currentStep}</span> },
              { key: 'status', header: 'Status', render: (l: CampaignLeadRow) => <StatusBadge label={l.status} variant={l.status === 'completed' ? 'success' : l.status === 'failed' ? 'danger' : l.status === 'replied' ? 'success' : 'info'} /> },
              { key: 'lastAction', header: 'Last Action', render: (l: CampaignLeadRow) => <span className="text-xs text-zinc-500">{l.lastAction || '—'}</span> },
            ]}
            data={paginated.data}
            keyExtractor={(l) => l.id}
          />
          <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={10} onPageChange={setPage} />
        </div>
      )}

      {tab === 'settings' && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <InfoList items={[
            { label: 'Daily Invite Limit', value: cd.dailyInviteLimit },
            { label: 'Daily Message Limit', value: cd.dailyMessageLimit },
            { label: 'Active Days', value: cd.activeDays.join(', ') },
            { label: 'Active Hours', value: `${cd.activeHoursStart} – ${cd.activeHoursEnd}` },
            { label: 'Stop on Reply', value: cd.stopOnReply ? 'Yes' : 'No' },
            { label: 'Sender Account', value: cd.senderAccount },
          ]} />
        </div>
      )}

      {tab === 'logs' && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <ActivityTimeline events={mockCampaignLeads.filter(l => l.lastActionAt).map(l => ({
            id: l.id, title: `${l.leadName} — ${l.lastAction}`, subtitle: l.company, timestamp: l.lastActionAt!,
          }))} />
        </div>
      )}
    </div>
  )
}
