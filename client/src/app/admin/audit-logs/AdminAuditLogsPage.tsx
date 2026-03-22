import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { useApi } from '@/hooks/useApi'
import { formatDateTime, filterBySearch, paginateItems } from '@/lib/utils'

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const pageSize = 10

  const { data: auditData } = useApi<any>('/api/admin/audit-log?limit=200')
  const logs = auditData?.logs || []

  const filtered = filterBySearch(logs, search, ['actor', 'action', 'target', 'userId'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle={`${logs.length} events recorded`} />

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search by actor, action, target..." />
        </div>
        <DataTable
          columns={[
            { key: 'time', header: 'Time', render: (e: any) => <span className="text-xs text-zinc-500 whitespace-nowrap">{formatDateTime(e.timestamp || e.createdAt)}</span> },
            { key: 'actor', header: 'Actor', render: (e: any) => (
              <div><div className="text-sm text-zinc-300">{e.actor || e.userId || 'System'}</div><div className="text-[10px] text-zinc-600">{e.actorEmail || ''}</div></div>
            )},
            { key: 'action', header: 'Action', render: (e: any) => (
              <span className="text-sm text-zinc-300 font-mono text-xs bg-zinc-800/50 px-2 py-0.5 rounded">{e.action}</span>
            )},
            { key: 'target', header: 'Target', render: (e: any) => <span className="text-sm text-zinc-400">{e.target || '—'}</span> },
            { key: 'category', header: 'Category', render: (e: any) => <span className="text-xs text-zinc-500">{e.category || 'general'}</span> },
          ]}
          data={paginated.data}
          keyExtractor={(e: any) => e.id}
          onRowClick={(e: any) => setSelected(e)}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DetailsDrawer open={!!selected} onClose={() => setSelected(null)} title="Audit Event" subtitle={selected?.action}>
        {selected && (
          <div className="space-y-5">
            <InfoList items={[
              { label: 'Timestamp', value: formatDateTime(selected.timestamp || selected.createdAt) },
              { label: 'Actor', value: selected.actor || selected.userId || 'System' },
              { label: 'Action', value: <span className="font-mono text-xs">{selected.action}</span> },
              { label: 'Target', value: selected.target || 'N/A' },
              { label: 'Category', value: selected.category || 'general' },
              { label: 'IP Address', value: selected.ip || 'N/A' },
            ]} />
            {selected.metadata && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Details</h4>
                <pre className="text-xs text-zinc-400 bg-zinc-800/50 p-3 rounded-xl overflow-x-auto">{JSON.stringify(typeof selected.metadata === 'string' ? JSON.parse(selected.metadata) : selected.metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </DetailsDrawer>
    </div>
  )
}
