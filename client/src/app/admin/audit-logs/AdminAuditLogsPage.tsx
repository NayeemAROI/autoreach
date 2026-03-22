import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { mockAuditLogs } from '@/data/mock'
import { formatDateTime, auditSeverityBadge, filterBySearch, paginateItems } from '@/lib/utils'
import type { AuditEvent } from '@/types'

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<AuditEvent | null>(null)
  const pageSize = 10

  const filtered = filterBySearch(mockAuditLogs, search, ['actor', 'action', 'target'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle={`${mockAuditLogs.length} events recorded`} />

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search by actor, action, target..." />
        </div>
        <DataTable
          columns={[
            { key: 'time', header: 'Time', render: (e: AuditEvent) => <span className="text-xs text-zinc-500 whitespace-nowrap">{formatDateTime(e.timestamp)}</span> },
            { key: 'actor', header: 'Actor', render: (e: AuditEvent) => (
              <div><div className="text-sm text-zinc-300">{e.actor}</div><div className="text-[10px] text-zinc-600">{e.actorEmail}</div></div>
            )},
            { key: 'action', header: 'Action', render: (e: AuditEvent) => (
              <span className="text-sm text-zinc-300 font-mono text-xs bg-zinc-800/50 px-2 py-0.5 rounded">{e.action}</span>
            )},
            { key: 'target', header: 'Target', render: (e: AuditEvent) => <span className="text-sm text-zinc-400">{e.target || '—'}</span> },
            { key: 'workspace', header: 'Workspace', render: (e: AuditEvent) => <span className="text-xs text-zinc-500">{e.workspaceName || 'Global'}</span> },
            { key: 'severity', header: 'Severity', render: (e: AuditEvent) => { const b = auditSeverityBadge(e.severity); return <StatusBadge label={b.label} variant={b.variant} /> } },
          ]}
          data={paginated.data}
          keyExtractor={(e) => e.id}
          onRowClick={(e) => setSelected(e)}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DetailsDrawer open={!!selected} onClose={() => setSelected(null)} title="Audit Event" subtitle={selected?.action}>
        {selected && (
          <div className="space-y-5">
            <InfoList items={[
              { label: 'Timestamp', value: formatDateTime(selected.timestamp) },
              { label: 'Actor', value: `${selected.actor} (${selected.actorEmail})` },
              { label: 'Action', value: <span className="font-mono text-xs">{selected.action}</span> },
              { label: 'Target', value: selected.target || 'N/A' },
              { label: 'Workspace', value: selected.workspaceName || 'Global' },
              { label: 'IP Address', value: selected.ip || 'N/A' },
              { label: 'Severity', value: (() => { const b = auditSeverityBadge(selected.severity); return <StatusBadge label={b.label} variant={b.variant} /> })() },
            ]} />
            {selected.details && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Details</h4>
                <pre className="text-xs text-zinc-400 bg-zinc-800/50 p-3 rounded-xl overflow-x-auto">{JSON.stringify(selected.details, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </DetailsDrawer>
    </div>
  )
}
