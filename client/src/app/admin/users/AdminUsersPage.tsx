import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu, DetailsDrawer } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { EmptyState } from '@/components/shared/Feedback'
import { useApi, useMutation } from '@/hooks/useApi'
import { formatRelativeTime, filterBySearch, paginateItems } from '@/lib/utils'
import { Download, UserPlus, Shield, Key, Trash2, Users } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const pageSize = 10

  const { data: usersData, loading, refetch } = useApi<any>('/api/admin/users')
  const { mutate } = useMutation()

  const users = usersData?.users || []
  const filtered = filterBySearch(users, search, ['name', 'email'])
  const paginated = paginateItems(filtered, page, pageSize)

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    const result = await mutate(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (result) refetch()
  }

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt('Enter new password (min 6 chars):')
    if (!newPassword || newPassword.length < 6) return
    await mutate(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle={`${users.length} registered users`}>
        <QuickActionButton icon={<Download className="w-4 h-4" />} label="Export" onClick={() => {}} />
        <QuickActionButton icon={<UserPlus className="w-4 h-4" />} label="Add User" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search users by name or email..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'User', render: (u: any) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center text-amber-400 text-xs font-bold">{u.name?.[0] || '?'}</div>
                <div><div className="text-sm font-medium text-zinc-200">{u.name}</div><div className="text-[11px] text-zinc-500">{u.email}</div></div>
              </div>
            )},
            { key: 'verified', header: 'Status', render: (u: any) => <StatusBadge label={u.is_verified ? 'Verified' : 'Unverified'} variant={u.is_verified ? 'success' : 'warning'} /> },
            { key: 'workspaces', header: 'Workspaces', render: (u: any) => <span className="text-sm text-zinc-300">{u.workspaceCount || 0}</span>, className: 'text-center' },
            { key: 'leads', header: 'Leads', render: (u: any) => <span className="text-sm text-zinc-300">{u.leadCount || 0}</span>, className: 'text-center' },
            { key: 'campaigns', header: 'Campaigns', render: (u: any) => <span className="text-sm text-zinc-300">{u.campaignCount || 0}</span>, className: 'text-center' },
            { key: 'joined', header: 'Joined', render: (u: any) => <span className="text-xs text-zinc-500">{formatRelativeTime(u.createdAt)}</span> },
            { key: 'actions', header: '', render: (u: any) => (
              <RowActionMenu actions={[
                { label: 'View Details', icon: <Users className="w-3.5 h-3.5" />, onClick: () => setSelectedUser(u) },
                { label: 'Reset Password', icon: <Key className="w-3.5 h-3.5" />, onClick: () => handleResetPassword(u.id) },
                { label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => handleDeleteUser(u.id), variant: 'danger' as const },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(u: any) => u.id}
          onRowClick={(u: any) => setSelectedUser(u)}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>

      <DetailsDrawer open={!!selectedUser} onClose={() => setSelectedUser(null)} title={selectedUser?.name || ''} subtitle={selectedUser?.email} width="max-w-md">
        {selectedUser && (
          <div className="space-y-6">
            <InfoList items={[
              { label: 'Email', value: selectedUser.email },
              { label: 'Verified', value: <StatusBadge label={selectedUser.is_verified ? 'Yes' : 'No'} variant={selectedUser.is_verified ? 'success' : 'warning'} /> },
              { label: 'Onboarded', value: selectedUser.has_completed_onboarding ? 'Yes' : 'No' },
              { label: 'Workspaces', value: selectedUser.workspaceCount || 0 },
              { label: 'Leads', value: selectedUser.leadCount || 0 },
              { label: 'Campaigns', value: selectedUser.campaignCount || 0 },
              { label: 'Joined', value: formatRelativeTime(selectedUser.createdAt) },
            ]} />
          </div>
        )}
      </DetailsDrawer>
    </div>
  )
}
