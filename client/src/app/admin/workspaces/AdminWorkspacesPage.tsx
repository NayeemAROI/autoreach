import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge, HealthBadge } from '@/components/shared/StatusBadge'
import { PageTabs } from '@/components/shared/PageTabs'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { StatCard } from '@/components/shared/StatCard'
import { mockWorkspaces, mockWorkspaceDetails } from '@/data/mock'
import { formatRelativeTime, workspaceStatusBadge, planBadge, filterBySearch, paginateItems } from '@/lib/utils'
import type { WorkspaceRow } from '@/types'
import { Eye, UserCog, CreditCard, Ban, Trash2, Linkedin } from 'lucide-react'

export default function AdminWorkspacesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedWs, setSelectedWs] = useState<WorkspaceRow | null>(null)
  const [detailTab, setDetailTab] = useState('overview')
  const pageSize = 10

  const filtered = filterBySearch(mockWorkspaces, search, ['name', 'ownerName', 'ownerEmail'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Workspaces" subtitle={`${mockWorkspaces.length} workspaces across the platform`} />

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search workspaces..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Workspace', render: (w: WorkspaceRow) => (
              <div><div className="text-sm font-medium text-zinc-200">{w.name}</div><div className="text-[11px] text-zinc-500">{w.ownerName}</div></div>
            )},
            { key: 'plan', header: 'Plan', render: (w: WorkspaceRow) => { const b = planBadge(w.plan); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'members', header: 'Members', render: (w: WorkspaceRow) => <span className="text-sm text-zinc-300">{w.memberCount}</span>, className: 'text-center' },
            { key: 'leads', header: 'Leads', render: (w: WorkspaceRow) => <span className="text-sm text-zinc-300">{w.leadCount.toLocaleString()}</span>, className: 'text-center' },
            { key: 'campaigns', header: 'Campaigns', render: (w: WorkspaceRow) => <span className="text-sm text-zinc-300">{w.campaignCount}</span>, className: 'text-center' },
            { key: 'linkedin', header: 'LinkedIn', render: (w: WorkspaceRow) => w.linkedinConnected
              ? <StatusBadge label="Connected" variant="success" />
              : <StatusBadge label="Disconnected" variant="neutral" />
            },
            { key: 'status', header: 'Status', render: (w: WorkspaceRow) => { const b = workspaceStatusBadge(w.status); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'actions', header: '', render: (w: WorkspaceRow) => (
              <RowActionMenu actions={[
                { label: 'Open Workspace', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setSelectedWs(w) },
                { label: 'Impersonate Owner', icon: <UserCog className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Change Plan', icon: <CreditCard className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Disable', icon: <Ban className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' },
                { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(w) => w.id}
          onRowClick={(w) => setSelectedWs(w)}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {/* Workspace Details Drawer */}
      <DetailsDrawer open={!!selectedWs} onClose={() => setSelectedWs(null)} title={selectedWs?.name || ''} subtitle={`Owner: ${selectedWs?.ownerName}`} width="max-w-lg">
        {selectedWs && (
          <div className="space-y-5">
            <PageTabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'members', label: 'Members', count: selectedWs.memberCount },
                { id: 'billing', label: 'Billing' },
              ]}
              activeTab={detailTab}
              onChange={setDetailTab}
            />
            {detailTab === 'overview' && (
              <InfoList items={[
                { label: 'Owner', value: selectedWs.ownerName },
                { label: 'Plan', value: (() => { const b = planBadge(selectedWs.plan); return <StatusBadge label={b.label} variant={b.variant} /> })() },
                { label: 'Members', value: selectedWs.memberCount },
                { label: 'Leads', value: selectedWs.leadCount.toLocaleString() },
                { label: 'Campaigns', value: selectedWs.campaignCount },
                { label: 'LinkedIn', value: selectedWs.linkedinConnected ? <StatusBadge label="Connected" variant="success" /> : <StatusBadge label="No" variant="neutral" /> },
                { label: 'Created', value: formatRelativeTime(selectedWs.createdAt) },
              ]} />
            )}
            {detailTab === 'members' && (
              <div className="space-y-2">
                {(mockWorkspaceDetails?.members || []).map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-zinc-800/40 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold">{m.name[0]}</div>
                      <div><div className="text-sm text-zinc-300">{m.name}</div><div className="text-[11px] text-zinc-500">{m.email}</div></div>
                    </div>
                    <StatusBadge label={m.role} variant={m.role === 'owner' ? 'accent' : m.role === 'admin' ? 'info' : 'neutral'} />
                  </div>
                ))}
              </div>
            )}
            {detailTab === 'billing' && (
              <InfoList items={[
                { label: 'Subscription', value: <StatusBadge label={mockWorkspaceDetails?.subscriptionStatus || 'N/A'} variant="success" /> },
                { label: 'Cycle', value: mockWorkspaceDetails?.billingCycle || 'N/A' },
                { label: 'Monthly Invites', value: (mockWorkspaceDetails?.monthlyInvites ?? 0).toLocaleString() },
                { label: 'Monthly Messages', value: (mockWorkspaceDetails?.monthlyMessages ?? 0).toLocaleString() },
              ]} />
            )}
          </div>
        )}
      </DetailsDrawer>
    </div>
  )
}
