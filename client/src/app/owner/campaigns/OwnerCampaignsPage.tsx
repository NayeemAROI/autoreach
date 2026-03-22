import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableToolbar } from '@/components/shared/SearchInput'
import { DataTable, TablePagination, RowActionMenu } from '@/components/tables/DataTable'
import { StatusBadge, HealthBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/Feedback'
import { mockCampaignSummaries } from '@/data/mock'
import { formatRelativeTime, campaignStatusBadge, filterBySearch, paginateItems } from '@/lib/utils'
import type { CampaignSummary } from '@/types'
import { Plus, Eye, Pause, Play, Copy, Archive } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { useNavigate } from 'react-router-dom'

export default function OwnerCampaignsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const pageSize = 10

  const filtered = filterBySearch(mockCampaignSummaries, search, ['name', 'senderAccount'])
  const paginated = paginateItems(filtered, page, pageSize)

  return (
    <div className="space-y-5">
      <PageHeader title="Campaigns" subtitle={`${mockCampaignSummaries.length} campaigns`}>
        <QuickActionButton icon={<Plus className="w-4 h-4" />} label="Create Campaign" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
        <div className="p-5">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search campaigns..." />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Campaign', render: (c: CampaignSummary) => (
              <div><div className="text-sm font-medium text-zinc-200">{c.name}</div><div className="text-[11px] text-zinc-500">by {c.createdBy}</div></div>
            )},
            { key: 'status', header: 'Status', render: (c: CampaignSummary) => { const b = campaignStatusBadge(c.status); return <StatusBadge label={b.label} variant={b.variant} /> } },
            { key: 'sender', header: 'Sender', render: (c: CampaignSummary) => <span className="text-xs text-zinc-400">{c.senderAccount}</span> },
            { key: 'leads', header: 'Leads', render: (c: CampaignSummary) => <span className="text-sm text-zinc-300">{c.leadsInFlow}</span>, className: 'text-center' },
            { key: 'invites', header: 'Invites', render: (c: CampaignSummary) => <span className="text-sm text-zinc-300">{c.invitesSent}</span>, className: 'text-center' },
            { key: 'accepted', header: 'Accepted', render: (c: CampaignSummary) => <span className="text-sm text-emerald-400">{c.accepted}</span>, className: 'text-center' },
            { key: 'replied', header: 'Replied', render: (c: CampaignSummary) => <span className="text-sm text-emerald-400 font-medium">{c.replied}</span>, className: 'text-center' },
            { key: 'health', header: 'Health', render: (c: CampaignSummary) => <HealthBadge health={c.health} /> },
            { key: 'actions', header: '', render: (c: CampaignSummary) => (
              <RowActionMenu actions={[
                { label: 'Open', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => navigate(`/owner/campaigns/${c.id}`) },
                { label: c.status === 'active' ? 'Pause' : 'Resume', icon: c.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => {} },
                { label: 'Archive', icon: <Archive className="w-3.5 h-3.5" />, onClick: () => {}, variant: 'danger' },
              ]} />
            ), className: 'w-10' },
          ]}
          data={paginated.data}
          keyExtractor={(c) => c.id}
          onRowClick={(c) => navigate(`/owner/campaigns/${c.id}`)}
        />
        <TablePagination page={page} totalPages={paginated.totalPages} total={paginated.total} pageSize={pageSize} onPageChange={setPage} />
      </div>
    </div>
  )
}
