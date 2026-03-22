import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/Feedback'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { mockLeads, mockLeadDetails } from '@/data/mock'
import { formatRelativeTime, leadStatusBadge, enrichmentBadge, verificationBadge, filterBySearch, paginateItems } from '@/lib/utils'
import type { LeadRow } from '@/types'
import { Upload, Plus, Download, Eye, Rocket, Trash2, CheckCircle } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function OwnerLeadsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<LeadRow | null>(null)
  const pageSize = 10
  const filtered = filterBySearch(mockLeads, search, ['firstName', 'lastName', 'company', 'email'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Leads" subtitle={`${mockLeads.length} leads in workspace`}>
        <QuickActionButton icon={<Download className="w-4 h-4" />} label="Export" onClick={() => {}} />
        <QuickActionButton icon={<Upload className="w-4 h-4" />} label="Import CSV" onClick={() => {}} />
        <QuickActionButton icon={<Plus className="w-4 h-4" />} label="Add Lead" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search leads..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Lead', render: (l: LeadRow) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/10 border border-violet-500/15 flex items-center justify-center text-violet-400 text-xs font-bold">{l.firstName[0]}{l.lastName[0]}</div>
                <div>
                  <div className="text-sm font-medium text-zinc-200">{l.firstName} {l.lastName}</div>
                  <div className="text-[11px] text-zinc-500">{l.title}{l.title && l.company ? ' at ' : ''}{l.company}</div>
                </div>
              </div>
            )},
            { key: 'email', header: 'Email', render: (l: LeadRow) => <span className="text-xs text-zinc-400">{l.email || '—'}</span> },
            { key: 'enriched', header: 'Enriched', render: (l: LeadRow) => { const b = enrichmentBadge(l.enrichmentStatus); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'verified', header: 'Verified', render: (l: LeadRow) => { const b = verificationBadge(l.verificationStatus); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'campaign', header: 'Campaign', render: (l: LeadRow) => <span className="text-xs text-zinc-400">{l.assignedCampaign || '—'}</span> },
            { key: 'status', header: 'Status', render: (l: LeadRow) => { const b = leadStatusBadge(l.status); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'actions', header: '', render: (l: LeadRow) => (
              <RowActionMenu actions={[
                { label: 'View Details', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setSelected(l) },
                { label: 'Add to Campaign', icon: <Rocket className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Verify', icon: <CheckCircle className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(l) => l.id}
          onRowClick={(l) => setSelected(l)}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DetailsDrawer open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName}` : ''} subtitle={selected?.company} width="max-w-md">
        {selected && (
          <div className="space-y-5">
            <InfoList items={[
              { label: 'Title', value: selected.title || 'N/A' },
              { label: 'Company', value: selected.company || 'N/A' },
              { label: 'Email', value: selected.email || 'N/A' },
              { label: 'LinkedIn', value: selected.linkedinUrl ? <a href={selected.linkedinUrl} target="_blank" className="text-violet-400 hover:underline text-xs">Open Profile</a> : 'N/A' },
              { label: 'Source', value: selected.source },
              { label: 'Status', value: (() => { const b = leadStatusBadge(selected.status); return <StatusBadge label={b.label} variant={b.variant} /> })() },
              { label: 'Added', value: formatRelativeTime(selected.createdAt) },
            ]} />
            {mockLeadDetails.notes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Notes</h4>
                {mockLeadDetails.notes.map((n, i) => (
                  <div key={i} className="py-2 border-b border-zinc-800/40 last:border-0">
                    <p className="text-sm text-zinc-300">{n.text}</p>
                    <p className="text-[10px] text-zinc-600 mt-1">{n.createdBy} · {formatRelativeTime(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DetailsDrawer>
    </div>
  )
}
