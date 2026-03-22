import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge, HealthBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { mockCampaignMonitor } from '@/data/mock'
import { formatRelativeTime, campaignStatusBadge, filterBySearch, paginateItems } from '@/lib/utils'
import type { CampaignMonitorRow } from '@/types'
import { Eye, Pause, Play, RotateCcw, FileText, RefreshCw } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function AdminCampaignMonitorPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<CampaignMonitorRow | null>(null)
  const pageSize = 10

  const filtered = filterBySearch(mockCampaignMonitor, search, ['name', 'workspaceName'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Campaign Monitor" subtitle="Live campaign performance across all workspaces">
        <QuickActionButton icon={<RefreshCw className="w-4 h-4" />} label="Auto Refresh" onClick={() => {}} />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search campaigns..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Campaign', render: (c: CampaignMonitorRow) => (
              <div><div className="text-sm font-medium text-zinc-200">{c.name}</div><div className="text-[11px] text-zinc-500">{c.workspaceName}</div></div>
            )},
            { key: 'status', header: 'Status', render: (c: CampaignMonitorRow) => { const b = campaignStatusBadge(c.status); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'queue', header: 'In Queue', render: (c: CampaignMonitorRow) => <span className="text-sm text-zinc-300">{c.leadsInQueue}</span>, className: 'text-center' },
            { key: 'sent', header: 'Sent Today', render: (c: CampaignMonitorRow) => <span className="text-sm text-zinc-300">{c.sentToday}</span>, className: 'text-center' },
            { key: 'replied', header: 'Replied', render: (c: CampaignMonitorRow) => <span className="text-sm text-emerald-400 font-medium">{c.replied}</span>, className: 'text-center' },
            { key: 'failed', header: 'Failed', render: (c: CampaignMonitorRow) => <span className={`text-sm font-medium ${c.failed > 0 ? 'text-red-400' : 'text-zinc-500'}`}>{c.failed}</span>, className: 'text-center' },
            { key: 'health', header: 'Health', render: (c: CampaignMonitorRow) => <HealthBadge health={c.health} /> },
            { key: 'actions', header: '', render: (c: CampaignMonitorRow) => (
              <RowActionMenu actions={[
                { label: 'View Details', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setSelected(c) },
                { label: c.status === 'active' ? 'Pause' : 'Resume', icon: c.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Force Retry', icon: <RotateCcw className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'View Logs', icon: <FileText className="w-3.5 h-3.5" />, onClick: () => {} },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(c) => c.id}
          onRowClick={(c) => setSelected(c)}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DetailsDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} subtitle={selected?.workspaceName}>
        {selected && (
          <InfoList items={[
            { label: 'Status', value: (() => { const b = campaignStatusBadge(selected.status); return <StatusBadge label={b.label} variant={b.variant} /> })() },
            { label: 'Health', value: <HealthBadge health={selected.health} /> },
            { label: 'Sender', value: selected.senderAccount || 'N/A' },
            { label: 'Leads in Queue', value: selected.leadsInQueue },
            { label: 'Sent Today', value: selected.sentToday },
            { label: 'Replied', value: selected.replied },
            { label: 'Failed', value: selected.failed },
            { label: 'Next Run', value: selected.nextRun ? formatRelativeTime(selected.nextRun) : 'N/A' },
            { label: 'Created', value: formatRelativeTime(selected.createdAt) },
          ]} />
        )}
      </DetailsDrawer>
    </div>
  )
}
