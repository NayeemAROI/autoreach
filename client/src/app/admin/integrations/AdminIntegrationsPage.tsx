import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { HealthBadge } from '@/components/shared/StatusBadge'
import { InfoList } from '@/components/shared/ActivityTimeline'
import { mockIntegrations } from '@/data/mock'
import { formatRelativeTime } from '@/lib/utils'
import { Plug, RefreshCw, ExternalLink } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'

export default function AdminIntegrationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Integrations" subtitle="External service health and configuration" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {mockIntegrations.map(integration => (
          <div key={integration.slug} className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden">
            <div className="p-5 border-b border-zinc-800/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                    <Plug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
                    <p className="text-[11px] text-zinc-500">{integration.description}</p>
                  </div>
                </div>
                <HealthBadge health={integration.health} />
              </div>
            </div>
            <div className="p-5">
              <InfoList items={[
                { label: 'Last Event', value: integration.lastEventAt ? formatRelativeTime(integration.lastEventAt) : 'Never' },
                { label: 'Failures', value: <span className={integration.failureCount > 5 ? 'text-red-400 font-semibold' : 'text-zinc-300'}>{integration.failureCount}</span> },
                { label: 'Configured', value: integration.configuredAt ? formatRelativeTime(integration.configuredAt) : 'Not configured' },
              ]} />
              <div className="flex gap-2 mt-4">
                <QuickActionButton icon={<RefreshCw className="w-3.5 h-3.5" />} label="Test" onClick={() => {}} />
                <QuickActionButton icon={<ExternalLink className="w-3.5 h-3.5" />} label="Config" onClick={() => {}} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
