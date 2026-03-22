import { useApi } from '@/hooks/useApi'
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/Feedback'
import { useAuth } from '@/context/AuthContext'
import { UserPlus, Users } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function OwnerTeamPage() {
  const { user } = useAuth() as any
  const wsId = user?.activeWorkspaceId

  const { data: membersData, loading } = useApi<any>(wsId ? `/api/workspaces/${wsId}/members` : null)
  const members = membersData?.members || []
  const invites = membersData?.invites || []

  const active = members.filter((m: any) => m.status === 'active').length
  const invited = invites.length

  return (
    <div className="space-y-5">
      <PageHeader title="Team" subtitle={`${members.length} members · ${invited} pending invites`}>
        <QuickActionButton icon={<UserPlus className="w-4 h-4" />} label="Invite Member" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/40">
          <SectionHeader title="Members" />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Member', render: (m: any) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">{(m.name || m.email || '?')[0]}</div>
                <div><div className="text-sm font-medium text-zinc-200">{m.name || m.email}</div><div className="text-[11px] text-zinc-500">{m.email}</div></div>
              </div>
            )},
            { key: 'role', header: 'Role', render: (m: any) => <StatusBadge label={m.role || 'member'} variant={m.role === 'owner' ? 'warning' : m.role === 'admin' ? 'info' : 'neutral'} /> },
            { key: 'status', header: 'Status', render: (m: any) => <StatusBadge label={m.status || 'active'} variant={m.status === 'active' ? 'success' : 'warning'} /> },
          ]}
          data={members}
          keyExtractor={(m: any) => m.id || m.userId}
        />
        {members.length === 0 && !loading && (
          <EmptyState icon={<Users className="w-7 h-7" />} title="No team members" description="Invite your first team member to collaborate." />
        )}
      </div>

      {invites.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/40">
            <SectionHeader title="Pending Invites" />
          </div>
          <DataTable
            columns={[
              { key: 'email', header: 'Email', render: (inv: any) => <span className="text-sm text-zinc-300">{inv.email}</span> },
              { key: 'role', header: 'Role', render: (inv: any) => <StatusBadge label={inv.role || 'member'} variant="neutral" /> },
              { key: 'status', header: 'Status', render: () => <StatusBadge label="Pending" variant="warning" /> },
            ]}
            data={invites}
            keyExtractor={(inv: any) => inv.id}
          />
        </div>
      )}
    </div>
  )
}
