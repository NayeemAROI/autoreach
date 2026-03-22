import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge, HealthBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime, campaignStatusBadge, filterBySearch, paginateItems } from '@/lib/utils'
import { Eye, Pause, Play, RotateCcw, FileText, RefreshCw } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function AdminCampaignMonitorPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const pageSize = 10

  const { data: campData, loading, refetch } = useApi<any>('/api/admin/campaigns')
  const campaigns = campData?.campaigns || []

  // Auto-refresh every 10s when enabled
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(refetch, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, refetch])

  const filtered = filterBySearch(campaigns, search, ['name', 'workspaceName', 'ownerName'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Campaign Monitor" subtitle={`${campaigns.length} campaigns across all workspaces`}>
        <QuickActionButton
          icon={<RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />}
          label={autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh'}
          onClick={() => setAutoRefresh(!autoRefresh)}
          variant={autoRefresh ? 'primary' : undefined}
        />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search campaigns..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Campaign', render: (c: any) => (
              <div><div className="text-sm font-medium text-zinc-200">{c.name}</div><div className="text-[11px] text-zinc-500">{c.workspaceName || c.ownerName || ''}</div></div>
            )},
            { key: 'status', header: 'Status', render: (c: any) => { const b = campaignStatusBadge(c.status); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'leads', header: 'Leads', render: (c: any) => <span className="text-sm text-zinc-300">{c.totalLeads}</span>, className: 'text-center' },
            { key: 'sent', header: 'Sent', render: (c: any) => <span className="text-sm text-zinc-300">{c.sent}</span>, className: 'text-center' },
            { key: 'replied', header: 'Replied', render: (c: any) => <span className="text-sm text-emerald-400 font-medium">{c.replied}</span>, className: 'text-center' },
            { key: 'failed', header: 'Failed', render: (c: any) => <span className={`text-sm font-medium ${c.failed > 0 ? 'text-red-400' : 'text-zinc-500'}`}>{c.failed}</span>, className: 'text-center' },
            { key: 'health', header: 'Health', render: (c: any) => <HealthBadge health={c.health} /> },
            { key: 'actions', header: '', render: (c: any) => (
              <RowActionMenu actions={[
                { label: 'View Details', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setSelected(c) },
                { label: c.status === 'active' ? 'Pause' : 'Resume', icon: c.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Force Retry', icon: <RotateCcw className="w-3.5 h-3.5" />, onClick: () => {} },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(c: any) => c.id}
          onRowClick={(c: any) => setSelected(c)}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DetailsDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} subtitle={selected?.workspaceName}>
        {selected && (
          <InfoList items={[
            { label: 'Status', value: (() => { const b = campaignStatusBadge(selected.status); return <StatusBadge label={b.label} variant={b.variant} /> })() },
            { label: 'Health', value: <HealthBadge health={selected.health} /> },
            { label: 'Owner', value: `${selected.ownerName || 'N/A'} (${selected.ownerEmail || ''})` },
            { label: 'Total Leads', value: selected.totalLeads },
            { label: 'Sent', value: selected.sent },
            { label: 'Replied', value: selected.replied },
            { label: 'Failed', value: selected.failed },
            { label: 'Created', value: formatRelativeTime(selected.createdAt) },
          ]} />
        )}
      </DetailsDrawer>
    </div>
  )
}
