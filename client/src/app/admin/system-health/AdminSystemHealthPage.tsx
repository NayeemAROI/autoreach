import { PageHeader, SectionHeader } from '@/components/shared/PageHeader'
import { HealthBadge, StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'
import { HeartPulse, Database, Cpu, Shield, Clock, AlertTriangle, RotateCcw, Terminal } from 'lucide-react'
import { QuickActionButton } from '@/components/shared/AlertStrip'
import { motion } from 'framer-motion'

const healthCards = [
  { title: 'Campaign Engine', icon: Cpu, health: 'healthy' as const, metrics: [
    { label: 'Active Campaigns', value: '34' },
    { label: 'Last Cron Run', value: '2m ago' },
    { label: 'Failed Jobs', value: '0' },
    { label: 'Queue Backlog', value: '12' },
  ]},
  { title: 'Database', icon: Database, health: 'healthy' as const, metrics: [
    { label: 'Avg Latency', value: '8ms' },
    { label: 'Connections', value: '24/100' },
    { label: 'Table Size', value: '2.4 GB' },
    { label: 'Last Backup', value: '6h ago' },
  ]},
  { title: 'API Gateway', icon: Terminal, health: 'healthy' as const, metrics: [
    { label: 'Avg Response', value: '120ms' },
    { label: 'Requests/min', value: '340' },
    { label: 'Error Rate', value: '0.1%' },
    { label: 'Active Sessions', value: '89' },
  ]},
  { title: 'Enrichment Pipeline', icon: HeartPulse, health: 'degraded' as const, metrics: [
    { label: 'Queue Size', value: '42' },
    { label: 'Processing Rate', value: '15/min' },
    { label: 'Failed', value: '8' },
    { label: 'Provider Health', value: 'Degraded' },
  ]},
  { title: 'Webhook System', icon: AlertTriangle, health: 'healthy' as const, metrics: [
    { label: 'Unipile', value: 'OK' },
    { label: 'Stripe', value: 'OK' },
    { label: 'Failed Deliveries', value: '1' },
    { label: 'Retry Queue', value: '0' },
  ]},
  { title: 'Security', icon: Shield, health: 'healthy' as const, metrics: [
    { label: 'Failed Logins (24h)', value: '3' },
    { label: 'Suspended Users', value: '1' },
    { label: 'Active JWT Sessions', value: '142' },
    { label: 'Last Audit', value: '2m ago' },
  ]},
]

export default function AdminSystemHealthPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="System Health" subtitle="Infrastructure and service monitoring">
        <QuickActionButton icon={<RotateCcw className="w-4 h-4" />} label="Run Diagnostics" onClick={() => {}} variant="primary" />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {healthCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                  <card.icon className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-semibold text-white">{card.title}</h3>
              </div>
              <HealthBadge health={card.health} />
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              {card.metrics.map(m => (
                <div key={m.label}>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{m.label}</p>
                  <p className="text-sm font-semibold text-zinc-300 mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
