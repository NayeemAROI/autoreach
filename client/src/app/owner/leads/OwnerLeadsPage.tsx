import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { EmptyState } from '@/components/shared/Feedback'
import { useApi } from '@/hooks/useApi'
import { formatRelativeTime, filterBySearch, paginateItems } from '@/lib/utils'
import { Download, Upload, Users } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function OwnerLeadsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<any>(null)
  const pageSize = 10

  const { data: leadsData, loading } = useApi<any>('/api/leads')
  const leads = leadsData?.leads || []

  const filtered = filterBySearch(leads, search, ['firstName', 'lastName', 'company', 'email'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Leads" subtitle={`${leads.length} leads in workspace`}>
        <QuickActionButton icon={<Download className="w-4 h-4" />} label="Export" onClick={() => {}} />
        <QuickActionButton icon={<Upload className="w-4 h-4" />} label="Import" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search leads..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Lead', render: (l: any) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/10 flex items-center justify-center text-violet-400 text-xs font-bold">{(l.firstName || l.name || '?')[0]}</div>
                <div>
                  <div className="text-sm font-medium text-zinc-200">{l.firstName} {l.lastName}</div>
                  <div className="text-[11px] text-zinc-500">{l.company || 'N/A'}</div>
                </div>
              </div>
            )},
            { key: 'email', header: 'Email', render: (l: any) => <span className="text-sm text-zinc-400">{l.email || '—'}</span> },
            { key: 'status', header: 'Status', render: (l: any) => <StatusBadge label={l.status || 'new'} variant={l.status === 'connected' ? 'success' : l.status === 'replied' ? 'success' : l.status === 'error' ? 'danger' : 'info'} /> },
            { key: 'source', header: 'Source', render: (l: any) => <span className="text-xs text-zinc-500">{l.source || 'manual'}</span> },
            { key: 'added', header: 'Added', render: (l: any) => <span className="text-xs text-zinc-500">{formatRelativeTime(l.createdAt)}</span> },
          ]}
          data={paginated.data}
          keyExtractor={(l: any) => l.id}
          onRowClick={(l: any) => setSelected(l)}
        />
        {leads.length === 0 && !loading && (
          <EmptyState icon={<Users className="w-7 h-7" />} title="No leads yet" description="Import leads or add them manually to get started." />
        )}
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DetailsDrawer open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ''} subtitle={selected?.company} width="max-w-md">
        {selected && (
          <div className="space-y-5">
            <InfoList items={[
              { label: 'Name', value: `${selected.firstName} ${selected.lastName}` },
              { label: 'Title', value: selected.title || 'N/A' },
              { label: 'Company', value: selected.company || 'N/A' },
              { label: 'Email', value: selected.email || 'N/A' },
              { label: 'LinkedIn', value: selected.linkedinUrl ? <a href={selected.linkedinUrl} target="_blank" className="text-violet-400 hover:underline text-xs">Open Profile</a> : 'N/A' },
              { label: 'Source', value: selected.source || 'manual' },
              { label: 'Status', value: <StatusBadge label={selected.status || 'new'} variant={selected.status === 'connected' ? 'success' : 'info'} /> },
              { label: 'Added', value: formatRelativeTime(selected.createdAt) },
            ]} />
          </div>
        )}
      </DetailsDrawer>
    </div>
  )
}
