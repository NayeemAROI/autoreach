import { useState } from 'react'
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable, RowActionMenu } from '@/components/tables/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/Feedback'
import { mockWorkspaceDetails } from '@/data/mock'
import { formatRelativeTime } from '@/lib/utils'
import { PERMISSION_MATRIX, PERMISSION_LABELS } from '@/lib/constants'
import type { WorkspaceMember } from '@/types'
import { UserPlus, Edit, Trash2, RotateCcw, Check, X } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function OwnerTeamPage() {
  const [showInvite, setShowInvite] = useState(false)
  const members = mockWorkspaceDetails?.members || []
  const active = members.filter(m => m.status === 'active').length
  const invited = members.filter(m => m.status === 'invited').length

  return (
    <div className="space-y-5">
      <PageHeader title="Team" subtitle={`${members.length} members in workspace`}>
        <QuickActionButton icon={<UserPlus className="w-4 h-4" />} label="Invite Member" onClick={() => setShowInvite(true)} variant="primary" />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={members.length} icon="Users" accentColor="text-violet-400" />
        <StatCard label="Admins" value={members.filter(m => m.role === 'admin' || m.role === 'owner').length} icon="ShieldCheck" accentColor="text-violet-400" />
        <StatCard label="Active Today" value={active} icon="Activity" accentColor="text-violet-400" />
        <StatCard label="Pending Invites" value={invited} icon="Clock" accentColor="text-violet-400" />
      </div>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <DataTable
          columns={[
            { key: 'member', header: 'Member', render: (m: WorkspaceMember) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/10 flex items-center justify-center text-violet-400 text-xs font-bold">{m.name[0]}</div>
                <div><div className="text-sm font-medium text-zinc-200">{m.name}</div><div className="text-[11px] text-zinc-500">{m.email}</div></div>
              </div>
            )},
            { key: 'role', header: 'Role', render: (m: WorkspaceMember) => <StatusBadge label={m.role} variant={m.role === 'owner' ? 'accent' : m.role === 'admin' ? 'info' : 'neutral'} /> },
            { key: 'status', header: 'Status', render: (m: WorkspaceMember) => <StatusBadge label={m.status} variant={m.status === 'active' ? 'success' : m.status === 'invited' ? 'warning' : 'neutral'} /> },
            { key: 'campaigns', header: 'Campaigns', render: (m: WorkspaceMember) => <span className="text-sm text-zinc-300">{m.campaignsOwned}</span>, className: 'text-center' },
            { key: 'lastActive', header: 'Last Active', render: (m: WorkspaceMember) => <span className="text-xs text-zinc-500">{m.lastActive ? formatRelativeTime(m.lastActive) : '—'}</span> },
            { key: 'actions', header: '', render: (m: WorkspaceMember) => m.role !== 'owner' ? (
              <RowActionMenu actions={[
                { label: 'Change Role', icon: <Edit className="w-3.5 h-3.5" />, onClick: () => {} },
                ...(m.status === 'invited' ? [{ label: 'Resend Invite', icon: <RotateCcw className="w-3.5 h-3.5" />, onClick: () => {} }] : []),
                { label: 'Remove', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' as const },
              ]} />
            ) : null, className: 'w-10' },
          ]}
          data={members}
          keyExtractor={(m) => m.id}
        />
      </div>

      {/* Permission Matrix */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/40">
          <SectionHeader title="Permission Matrix" subtitle="Role-based access control" />
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/40">
              <th className="text-left px-5 py-3 text-[11px] uppercase text-zinc-500 font-semibold">Permission</th>
              <th className="text-center px-5 py-3 text-[11px] uppercase text-zinc-500 font-semibold">Owner</th>
              <th className="text-center px-5 py-3 text-[11px] uppercase text-zinc-500 font-semibold">Admin</th>
              <th className="text-center px-5 py-3 text-[11px] uppercase text-zinc-500 font-semibold">Member</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(PERMISSION_MATRIX).map(([key, perms]) => (
              <tr key={key} className="border-b border-zinc-800/30">
                <td className="px-5 py-3 text-sm text-zinc-300">{PERMISSION_LABELS[key]}</td>
                {(['owner', 'admin', 'member'] as const).map(role => (
                  <td key={role} className="text-center px-5 py-3">
                    {perms[role] ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-zinc-700 mx-auto" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Dialog */}
      <ConfirmDialog open={showInvite} title="Invite Team Member" description="Enter the email address of the person you want to invite to this workspace." confirmLabel="Send Invite" onConfirm={() => setShowInvite(false)} onCancel={() => setShowInvite(false)} />
    </div>
  )
}
