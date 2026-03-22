import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { PageTabs } from '@/components/shared/PageTabs'
import { mockUsers, mockUserDetails } from '@/data/mock'
import { formatRelativeTime, userStatusBadge, planBadge, filterBySearch, paginateItems } from '@/lib/utils'
import type { UserRow } from '@/types'
import { Eye, Building2, UserCog, KeyRound, Ban, ShieldCheck, Trash2, Download, UserPlus } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const pageSize = 10

  const filtered = filterBySearch(mockUsers, search, ['name', 'email'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle={`${mockUsers.length} registered users`}>
        <QuickActionButton icon={<Download className="w-4 h-4" />} label="Export" onClick={() => {}} />
        <QuickActionButton icon={<UserPlus className="w-4 h-4" />} label="Add User" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search users by name or email..." />
        </div>

        <DataTable
          columns={[
            { key: 'user', header: 'User', render: (u: UserRow) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/15 flex items-center justify-center text-amber-400 text-xs font-bold">{u.name[0]}</div>
                <div><div className="text-sm font-medium text-zinc-200">{u.name}</div><div className="text-[11px] text-zinc-500">{u.email}</div></div>
              </div>
            )},
            { key: 'role', header: 'Role', render: (u: UserRow) => <span className="text-xs text-zinc-400 font-medium capitalize">{u.globalRole}</span> },
            { key: 'plan', header: 'Plan', render: (u: UserRow) => { const b = planBadge(u.plan); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'workspaces', header: 'Workspaces', render: (u: UserRow) => <span className="text-sm text-zinc-300">{u.workspaceCount}</span>, className: 'text-center' },
            { key: 'lastActive', header: 'Last Active', render: (u: UserRow) => <span className="text-xs text-zinc-500">{formatRelativeTime(u.lastActive)}</span> },
            { key: 'status', header: 'Status', render: (u: UserRow) => { const b = userStatusBadge(u.status); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'actions', header: '', render: (u: UserRow) => (
              <RowActionMenu actions={[
                { label: 'View Profile', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setSelectedUser(u) },
                { label: 'View Workspaces', icon: <Building2 className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Impersonate', icon: <UserCog className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Reset Password', icon: <KeyRound className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Suspend', icon: <Ban className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' },
                { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(u) => u.id}
          onRowClick={(u) => setSelectedUser(u)}
        />

        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      {/* User Details Drawer */}
      <DetailsDrawer open={!!selectedUser} onClose={() => setSelectedUser(null)} title={selectedUser?.name || ''} subtitle={selectedUser?.email} width="max-w-md">
        {selectedUser && (
          <div className="space-y-6">
            <InfoList items={[
              { label: 'Global Role', value: <span className="capitalize">{selectedUser.globalRole}</span> },
              { label: 'Plan', value: (() => { const b = planBadge(selectedUser.plan); return <StatusBadge label={b.label} variant={b.variant} /> })() },
              { label: 'Status', value: (() => { const b = userStatusBadge(selectedUser.status); return <StatusBadge label={b.label} variant={b.variant} /> })() },
              { label: 'Workspaces', value: selectedUser.workspaceCount },
              { label: 'Last Active', value: formatRelativeTime(selectedUser.lastActive) },
              { label: 'Joined', value: formatRelativeTime(selectedUser.createdAt) },
            ]} />

            <div>
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Workspaces</h4>
              {mockUserDetails.workspaces.map(ws => (
                <div key={ws.id} className="flex items-center justify-between py-2 border-b border-zinc-800/40 last:border-0">
                  <span className="text-sm text-zinc-300">{ws.name}</span>
                  <span className="text-[11px] text-zinc-500 capitalize">{ws.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailsDrawer>
    </div>
  )
}
