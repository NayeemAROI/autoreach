import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { HealthBadge, StatusBadge } from '@/components/shared/StatusBadge'
import { UsageProgressCard } from '@/components/shared/UsageProgressCard'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { mockLinkedInHealth } from '@/data/mock'
import { formatRelativeTime } from '@/lib/utils'
import { RefreshCw, Wifi, WifiOff, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { ConfirmDialog } from '@/components/shared/Feedback'
import { useState } from 'react'

export default function OwnerLinkedInPage() {
  const li = mockLinkedInHealth
  const [showDisconnect, setShowDisconnect] = useState(false)

  return (
    <div className="space-y-5">
      <PageHeader title="LinkedIn" subtitle="Account connection and health monitoring">
        <QuickActionButton icon={<RefreshCw className="w-4 h-4" />} label="Refresh Status" onClick={() => {}} />
        <QuickActionButton icon={<RotateCcw className="w-4 h-4" />} label="Sync Now" onClick={() => {}} variant="primary" />
      </PageHeader>

      {/* Health Card */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              {li.connected ? <Wifi className="w-5 h-5 text-blue-400" /> : <WifiOff className="w-5 h-5 text-zinc-500" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{li.accountName || 'Not Connected'}</h3>
              <p className="text-xs text-zinc-500">{li.connected ? 'LinkedIn account connected' : 'No account connected'}</p>
            </div>
          </div>
          <HealthBadge health={li.sessionHealth} />
        </div>
        <InfoList items={[
          { label: 'Session Health', value: <HealthBadge health={li.sessionHealth} /> },
          { label: 'Last Sync', value: li.lastSyncAt ? formatRelativeTime(li.lastSyncAt) : 'Never' },
          { label: 'Inbox Sync', value: <HealthBadge health={li.inboxSyncHealth} /> },
          { label: 'Webhook Health', value: <HealthBadge health={li.webhookHealth} /> },
        ]} />
      </div>

      {/* Usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UsageProgressCard label="Daily Invites" used={li.inviteUsage.used} limit={li.inviteUsage.limit} />
        <UsageProgressCard label="Daily Messages" used={li.messageUsage.used} limit={li.messageUsage.limit} />
      </div>

      {/* Recent Events */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 p-5">
        <SectionHeader title="Recent Sync Events" />
        <div className="mt-3">
          <ActivityTimeline events={li.recentEvents.map((e, i) => ({
            id: `li-${i}`,
            title: e.message,
            subtitle: e.type,
            timestamp: e.timestamp,
          }))} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
            <p className="text-xs text-zinc-500 mt-0.5">These actions are destructive and cannot be easily undone.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <QuickActionButton icon={<WifiOff className="w-4 h-4" />} label="Disconnect Account" onClick={() => setShowDisconnect(true)} />
          <QuickActionButton icon={<RotateCcw className="w-4 h-4" />} label="Reset Sync State" onClick={() => {}} />
        </div>
      </div>

      <ConfirmDialog open={showDisconnect} title="Disconnect LinkedIn" description="This will disconnect your LinkedIn account. Active campaigns will stop. You can reconnect later." confirmLabel="Disconnect" variant="danger" onConfirm={() => setShowDisconnect(false)} onCancel={() => setShowDisconnect(false)} />
    </div>
  )
}
