import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { EmptyState } from '@/components/shared/Feedback'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime, filterBySearch, paginateItems } from '@/lib/utils'
import { Building2, Eye, Ban } from 'lucide-react'

export default function AdminWorkspacesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const pageSize = 10

  const { data: wsData, loading } = useApi<any>('/api/admin/workspaces')
  const workspaces = wsData?.workspaces || []

  const filtered = filterBySearch(workspaces, search, ['name', 'ownerName', 'ownerEmail', 'slug'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Workspaces" subtitle={`${workspaces.length} workspaces`} />

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search workspaces..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Workspace', render: (w: any) => (
              <div>
                <div className="text-sm font-medium text-zinc-200">{w.name}</div>
                <div className="text-[11px] text-zinc-500">{w.slug}</div>
              </div>
            )},
            { key: 'owner', header: 'Owner', render: (w: any) => (
              <div>
                <div className="text-sm text-zinc-300">{w.ownerName || 'N/A'}</div>
                <div className="text-[10px] text-zinc-600">{w.ownerEmail}</div>
              </div>
            )},
            { key: 'members', header: 'Members', render: (w: any) => <span className="text-sm text-zinc-300">{w.memberCount || 0}</span>, className: 'text-center' },
            { key: 'leads', header: 'Leads', render: (w: any) => <span className="text-sm text-zinc-300">{w.leadCount || 0}</span>, className: 'text-center' },
            { key: 'campaigns', header: 'Campaigns', render: (w: any) => <span className="text-sm text-zinc-300">{w.campaignCount || 0}</span>, className: 'text-center' },
            { key: 'created', header: 'Created', render: (w: any) => <span className="text-xs text-zinc-500">{formatRelativeTime(w.createdAt)}</span> },
            { key: 'actions', header: '', render: (w: any) => (
              <RowActionMenu actions={[
                { label: 'View Details', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setSelected(w) },
                { label: 'Suspend', icon: <Ban className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' as const },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(w: any) => w.id}
          onRowClick={(w: any) => setSelected(w)}
        />
        {workspaces.length === 0 && !loading && (
          <EmptyState icon={<Building2 className="w-7 h-7" />} title="No workspaces" description="Workspaces will appear here when users register." />
        )}
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DetailsDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} subtitle={selected?.slug} width="max-w-md">
        {selected && (
          <InfoList items={[
            { label: 'Owner', value: `${selected.ownerName || 'N/A'} (${selected.ownerEmail || ''})` },
            { label: 'Members', value: selected.memberCount || 0 },
            { label: 'Leads', value: selected.leadCount || 0 },
            { label: 'Campaigns', value: selected.campaignCount || 0 },
            { label: 'Created', value: formatRelativeTime(selected.createdAt) },
          ]} />
        )}
      </DetailsDrawer>
    </div>
  )
}
