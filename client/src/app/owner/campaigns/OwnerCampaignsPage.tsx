import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/Feedback'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime, campaignStatusBadge, filterBySearch, paginateItems } from '@/lib/utils'
import { Plus, Pause, Play, Copy, Trash2, Rocket } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { useNavigate } from 'react-router-dom'

export default function OwnerCampaignsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 10
  const navigate = useNavigate()

  const { data: campData, loading } = useApi<any>('/api/campaigns')
  const campaigns = campData?.campaigns || []

  const filtered = filterBySearch(campaigns, search, ['name'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Campaigns" subtitle={`${campaigns.length} campaigns`}>
        <QuickActionButton icon={<Plus className="w-4 h-4" />} label="New Campaign" onClick={() => navigate('/campaigns/new/builder')} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search campaigns..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Campaign', render: (c: any) => (
              <div><div className="text-sm font-medium text-zinc-200">{c.name}</div><div className="text-[11px] text-zinc-500">{c.type || 'connection'} sequence</div></div>
            )},
            { key: 'status', header: 'Status', render: (c: any) => { const b = campaignStatusBadge(c.status); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'leads', header: 'Leads', render: (c: any) => {
              const leadIds = JSON.parse(c.leadIds || '[]')
              return <span className="text-sm text-zinc-300">{leadIds.length}</span>
            }, className: 'text-center' },
            { key: 'stats', header: 'Sent / Replied', render: (c: any) => {
              const s = JSON.parse(c.stats || '{}')
              return <span className="text-sm text-zinc-300">{s.sent || 0} / {s.replied || 0}</span>
            }, className: 'text-center' },
            { key: 'created', header: 'Created', render: (c: any) => <span className="text-xs text-zinc-500">{formatRelativeTime(c.createdAt)}</span> },
            { key: 'actions', header: '', render: (c: any) => (
              <RowActionMenu actions={[
                { label: c.status === 'active' ? 'Pause' : 'Resume', icon: c.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' as const },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(c: any) => c.id}
          onRowClick={(c: any) => navigate(`/owner/campaigns/${c.id}`)}
        />
        {campaigns.length === 0 && !loading && (
          <EmptyState icon={<Rocket className="w-7 h-7" />} title="No campaigns yet" description="Create your first campaign to start outreach." />
        )}
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  )
}
