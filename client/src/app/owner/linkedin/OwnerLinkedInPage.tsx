import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { HealthBadge, StatusBadge } from '@/components/shared/StatusBadge'
import { UsageProgressCard } from '@/components/shared/UsageProgressCard'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { EmptyState } from '@/components/shared/Feedback'
import { useApi } from '@/hooks/useApi'
import { RefreshCw, Link2, Unlink } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function OwnerLinkedInPage() {
  const { data: liData, loading, refetch } = useApi<any>('/api/integrations/status')
  const li = liData || {}

  return (
    <div className="space-y-5">
      <PageHeader title="LinkedIn Integration" subtitle="LinkedIn account connection and health">
        <QuickActionButton icon={<RefreshCw className="w-4 h-4" />} label="Refresh Status" onClick={refetch} />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Connection Status */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader title="Connection Status" />
            <HealthBadge health={li.connected ? 'healthy' : 'offline'} />
          </div>
          <InfoList items={[
            { label: 'Status', value: <StatusBadge label={li.connected ? 'Connected' : 'Not Connected'} variant={li.connected ? 'success' : 'danger'} /> },
            { label: 'Account', value: li.linkedinEmail || li.accountName || 'N/A' },
            { label: 'Session Health', value: li.sessionHealth || li.health || 'unknown' },
            { label: 'Provider', value: li.provider || 'unipile' },
          ]} />
          <div className="flex gap-2 mt-4">
            {li.connected ? (
              <QuickActionButton icon={<Unlink className="w-3.5 h-3.5" />} label="Disconnect" onClick={() => {}} />
            ) : (
              <QuickActionButton icon={<Link2 className="w-3.5 h-3.5" />} label="Connect LinkedIn" onClick={() => window.location.href = '/integrations'} variant="primary" />
            )}
          </div>
        </div>

        {/* Usage */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
          <SectionHeader title="Daily Usage" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <UsageProgressCard label="Invites Sent" used={li.inviteUsage?.used || li.invitesSentToday || 0} limit={li.inviteUsage?.limit || li.dailyInviteLimit || 25} />
            <UsageProgressCard label="Messages Sent" used={li.messageUsage?.used || li.messagesSentToday || 0} limit={li.messageUsage?.limit || li.dailyMessageLimit || 50} />
          </div>
          {li.syncStatus && (
            <div className="mt-4">
              <InfoList items={[
                { label: 'Last Sync', value: li.syncStatus.lastSync || 'Never' },
                { label: 'Contacts Synced', value: li.syncStatus.contactsSynced || 0 },
              ]} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
