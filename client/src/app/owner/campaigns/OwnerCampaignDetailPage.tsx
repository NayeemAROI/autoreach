import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageTabs } from '@/components/shared/PageTabs'
import { MetricGrid } from '@/components/shared/StatCard'
import { StatusBadge, HealthBadge } from '@/components/shared/StatusBadge'
import { DataTable, TablePagination } from '@/components/tables/DataTable'
import { EmptyState } from '@/components/shared/Feedback'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime, campaignStatusBadge, paginateItems } from '@/lib/utils'
import type { DashboardKPI } from '@/types'
import { Pause, Play, RotateCcw, ArrowLeft, Rocket } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { useNavigate } from 'react-router-dom'

export default function OwnerCampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('leads')
  const [page, setPage] = useState(0)
  const pageSize = 10

  const { data: campaign, loading } = useApi<any>(id ? `/api/campaigns/${id}` : null)

  if (loading) {
    return <div className="space-y-5"><div className="h-32 shimmer rounded-2xl" /><div className="h-64 shimmer rounded-2xl" /></div>
  }

  if (!campaign) {
    return <EmptyState icon={<Rocket className="w-7 h-7" />} title="Campaign not found" description="This campaign may have been deleted." />
  }

  const c = campaign.campaign || campaign
  const stats = typeof c.stats === 'string' ? JSON.parse(c.stats || '{}') : c.stats || {}
  const leadIds = typeof c.leadIds === 'string' ? JSON.parse(c.leadIds || '[]') : c.leadIds || []
  const steps = typeof c.steps === 'string' ? JSON.parse(c.steps || '[]') : c.steps || []
  const campaignLeads = campaign.leads || []
  const statusBadge = campaignStatusBadge(c.status)

  const kpis: DashboardKPI[] = [
    { label: 'Total Leads', value: leadIds.length || campaignLeads.length, icon: 'Users' },
    { label: 'Sent', value: stats.sent || 0, icon: 'Send' },
    { label: 'Accepted', value: stats.accepted || 0, icon: 'UserCheck' },
    { label: 'Replied', value: stats.replied || 0, icon: 'MessageSquare' },
  ]

  const paginated = paginateItems(campaignLeads, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title={c.name || 'Campaign'} subtitle={`Created ${formatRelativeTime(c.createdAt)}`}>
        <QuickActionButton icon={<ArrowLeft className="w-4 h-4" />} label="Back" onClick={() => navigate('/owner/campaigns')} />
        <StatusBadge label={statusBadge.label} variant={statusBadge.variant} />
        <QuickActionButton
          icon={c.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          label={c.status === 'active' ? 'Pause' : 'Resume'}
          onClick={() => {}}
          variant={c.status === 'active' ? undefined : 'primary'}
        />
      </PageHeader>

      <MetricGrid metrics={kpis} columns={4} accentColor="text-violet-400" />

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 pt-4">
          <PageTabs
            tabs={[
              { id: 'leads', label: 'Leads', count: campaignLeads.length || leadIds.length },
              { id: 'steps', label: 'Steps', count: steps.length },
              { id: 'settings', label: 'Settings' },
            ]}
            activeTab={tab} onChange={setTab}
          />
        </div>

        {tab === 'leads' && (
          <>
            <DataTable
              columns={[
                { key: 'name', header: 'Lead', render: (l: any) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">{(l.firstName || l.name || '?')[0]}</div>
                    <div><div className="text-sm text-zinc-200">{l.firstName || l.name} {l.lastName || ''}</div><div className="text-[11px] text-zinc-500">{l.company || ''}</div></div>
                  </div>
                )},
                { key: 'status', header: 'Status', render: (l: any) => <StatusBadge label={l.status || 'pending'} variant={l.status === 'completed' || l.status === 'replied' ? 'success' : l.status === 'error' ? 'danger' : 'info'} /> },
                { key: 'step', header: 'Step', render: (l: any) => <span className="text-sm text-zinc-400">{l.currentStep || l.step || 0}/{steps.length || '?'}</span>, className: 'text-center' },
              ]}
              data={paginated.data}
              keyExtractor={(l: any) => l.id || l.leadId}
            />
            <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}

        {tab === 'steps' && (
          <div className="p-5 space-y-3">
            {steps.length === 0 && <p className="text-sm text-zinc-500 text-center py-4">No steps configured</p>}
            {steps.map((step: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold shrink-0">{i + 1}</div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{step.type || step.action || 'Step'}</p>
                  <p className="text-xs text-zinc-500 mt-1">{step.template || step.message || step.content || 'No template'}</p>
                  {step.delay && <p className="text-[11px] text-zinc-600 mt-1">Delay: {step.delay}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="p-5">
            <div className="space-y-3 text-sm max-w-md">
              <div className="flex justify-between py-2 border-b border-zinc-800/30"><span className="text-zinc-500">Type</span><span className="text-zinc-300">{c.type || 'connection'}</span></div>
              <div className="flex justify-between py-2 border-b border-zinc-800/30"><span className="text-zinc-500">Status</span><StatusBadge label={c.status} variant={statusBadge.variant} /></div>
              <div className="flex justify-between py-2 border-b border-zinc-800/30"><span className="text-zinc-500">Created</span><span className="text-zinc-300">{formatRelativeTime(c.createdAt)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
